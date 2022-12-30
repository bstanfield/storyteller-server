const db = require("./db");
const { camelCase, pickStoryteller } = require("./helpers");

const handleDeck = async (game) => {
  // Get all players in game
  const players = await db.getPlayersInGame(game);
  // Get all player hands
  const playerHands = await Promise.all(
    players.map(async (player) => {
      const hand = await db.getHand(player.player_games_id);
      return {
        player_id: player.player_id,
        hand,
      };
    })
  );

  // Get all cards not in player hands
  const deck = await db.getCards();
  const cardsInHands = playerHands.map((player) => player.hand).flat();
  const remainingCardsInDeck = deck.filter(
    (card) => !cardsInHands.find((cardInHand) => cardInHand.card_id === card.id)
  );
  return remainingCardsInDeck;
};

const handleCardSubmissions = async (game) => {
  const players = await db.getPlayersInGame(game);
  let round = await handleRound(game);

  let playersThatHaveSubmitted = (
    await db.getPlayersWithHandCardWithRoundId(round.id)
  ).map((player) => player);
  let playersThatHaveNotSubmitted = [];
  for (let player of players) {
    const submitted = playersThatHaveSubmitted.map(
      (player) => player.player_games_id
    );
    if (
      !submitted.includes(player.player_games_id) &&
      player.player_id !== round.storyteller.playerId
    ) {
      playersThatHaveNotSubmitted.push(camelCase(player));
    }
  }

  playersThatHaveSubmitted = await Promise.all(
    playersThatHaveSubmitted.map(async (submission) => {
      const [card] = await db.getCard(submission.card_id);
      return {
        ...camelCase(submission),
        imgixPath: card.imgix_path,
      };
    })
  );

  const votes = await db.getVotes(round.id);
  let playersThatHaveVoted = votes.map((vote) => camelCase(vote));
  let playersThatHaveNotVoted = [];
  for (let player of players) {
    const playerGameIdsOfVoters = playersThatHaveVoted.map(
      (player) => player.voterPlayerGamesId
    );
    if (
      !playerGameIdsOfVoters.includes(player.player_games_id) &&
      player.player_id !== round.storyteller.playerId
    ) {
      playersThatHaveNotVoted.push(camelCase(player));
    }
  }

  if (
    playersThatHaveNotVoted.length === 0 &&
    players.length > 1 &&
    !round.completedAt
  ) {
    // Set round completed_at to now
    await db.addCompletedAtToRound(round.id);
    round.completedAt = new Date();
    console.log("Adding completed_at to round!");
    console.log("round: ", round);
  }

  return {
    ...camelCase(round),
    submissions: {
      playersThatHaveSubmitted,
      playersThatHaveNotSubmitted,
    },
    votes: {
      playersThatHaveVoted,
      playersThatHaveNotVoted,
    },
  };
};

// Write a function that takes in a hand and ensures that it always has the appropriate number of cards in it
// Todo: Need to be able to shuffle deck when out of cards
const handleHand = async (hand, player_games_id, newRound, deck) => {
  let idealHandSize = 6;
  const cardsInDb = await db.getCards();

  // Includes cards that have been played by the player
  const cardsInHand = hand.map((card) => {
    return {
      card_id: card.card_id,
      played_at: card.played_at,
      imgix_path: cardsInDb.find((cardInDb) => cardInDb.id === card.card_id)
        .imgix_path,
    };
  });

  console.log("New round: ", newRound);
  console.log("Player Games ID: ", player_games_id);
  console.log("cards in hand: ", cardsInHand.length);

  const cardsInHandUnplayed = cardsInHand.filter(
    (card) => card.played_at === null
  );
  console.log("cards in hand unplayed: ", cardsInHandUnplayed.length);

  if (cardsInHandUnplayed.length === 0) {
    // Get 7 random cards from deck
    const randomCards = [];
    let randomIndices = [];
    for (let i = 0; i < idealHandSize; i++) {
      let randomIndex = Math.floor(Math.random() * deck.length);
      // Keep cycling until you get a non-duplicate index
      while (randomIndices.includes(randomIndex)) {
        randomIndex = Math.floor(Math.random() * deck.length);
      }
      randomIndices.push(randomIndex);
      randomCards.push(deck[randomIndex]);
    }
    randomCards.map((card) => db.insertHandCard(player_games_id, card.id));
    return randomCards;
  } else if (cardsInHandUnplayed.length < idealHandSize) {
    // If newRound, and there are less than appropriate # of unplayed cards in hand, add cards until there are appropriate #
    const cardsToAdd = idealHandSize - cardsInHandUnplayed.length;
    const randomCards = [];
    let randomIndices = [];
    for (let i = 0; i < cardsToAdd; i++) {
      const randomIndex = Math.floor(Math.random() * deck.length);
      // Keep cycling until you get a non-duplicate index
      while (randomIndices.includes(randomIndex)) {
        randomIndex = Math.floor(Math.random() * deck.length);
      }
      randomIndices.push(randomIndex);
      randomCards.push(deck[randomIndex]);
    }
    randomCards.map((card) => db.insertHandCard(player_games_id, card.id));
    return [...cardsInHandUnplayed, ...randomCards];
  } else {
    return cardsInHandUnplayed; // Only return cards that have not been played yet
  }
};

const handleRound = async (game) => {
  const rounds = await db.getRounds(game);
  const [latestRound] = rounds;

  if (latestRound && latestRound.completed_at === null) {
    const [storyteller] = await db.getPlayer(latestRound.player_storyteller);
    return camelCase({ storyteller, ...latestRound });
  } else {
    // If there is no round, create a new one.
    // Also, if the latest round is completed, create a new one
    const players = await db.getPlayersInGame(game);
    const playerIds = players.map((player) => player.player_id);
    const storyteller = pickStoryteller(playerIds, rounds.length);
    const storytellerObj = players.find(
      (player) => player.player_id === storyteller
    );
    const [round] = await db.insertRound(game, storyteller);
    return camelCase({ storyteller: storytellerObj, ...round });
  }
};

const handlePlayers = async (game) => {
  const players = await db.getPlayersInGame(game);
  const playersWithStatus = await determinePlayerStatus(players, game);
  const playerScores = await handleScore(game);

  // Merge playerScores into playersWithStatus
  const playersWithScores = playersWithStatus.map((player) => {
    const playerScore = playerScores.find(
      (playerScore) => playerScore.playerId === player.playerId
    );
    return { ...player, score: playerScore.score };
  });
  return playersWithScores;
};

// If you're the storyteller, you get:
// 3 points if at least 1 person votes for your card but not everyone
// 0 points if everyone votes for your card
// If you're not the storyteller, you get:
// 3 points if you vote for the storyteller's card
// 0 points if you don't vote for the storyteller's card
// 1 bonus point per person who votes for your card

const determinePlayerStatus = async (players, game) => {
  // Player status is either "playing" or "waiting", depending on whether they have submitted a card
  let playersWithStatus = players.map((player) => camelCase(player)); // Need to get this in camel case to match roundAndSubmissionData
  const roundAndSubmissionData = await handleCardSubmissions(game);

  const { submissions, votes, storyteller } = roundAndSubmissionData;

  if (roundAndSubmissionData.clue === null) {
    // Clue phase
    playersWithStatus.forEach((player, i) => {
      if (player.playerId === storyteller.playerId) {
        playersWithStatus[i].status = "playing";
      } else {
        playersWithStatus[i].status = "waiting";
      }
    });
  } else if (submissions.playersThatHaveNotSubmitted.length > 0) {
    // Submission phase
    playersWithStatus.forEach((player, i) => {
      if (
        submissions.playersThatHaveNotSubmitted.find(
          (playerThatHasNotSubmitted) =>
            playerThatHasNotSubmitted.playerId === player.playerId
        )
      ) {
        playersWithStatus[i].status = "playing";
      } else {
        playersWithStatus[i].status = "waiting";
      }
      if (player.playerId === storyteller.playerId) {
        playersWithStatus[i].status = "waiting";
      }
    });
  } else if (votes.playersThatHaveNotVoted.length > 0) {
    // Voting phase
    playersWithStatus.forEach((player, i) => {
      if (
        votes.playersThatHaveNotVoted.find(
          (playerThatHasNotVoted) =>
            playerThatHasNotVoted.playerId === player.playerId
        )
      ) {
        playersWithStatus[i].status = "playing";
      } else {
        playersWithStatus[i].status = "waiting";
      }
      if (player.playerId === storyteller.playerId) {
        playersWithStatus[i].status = "waiting";
      }
    });
  } else {
    // Scoring phase
    playersWithStatus.forEach((player, i) => {
      playersWithStatus[i].status = "hidden";
    });
  }

  return playersWithStatus;
};

const scorePlayer = async (player, completedRounds) => {
  let score = 0;
  for (let round of completedRounds) {
    const votes = await db.getVotes(round.id);
    const [storytellerPlayer] = await db.getPlayerInGame(
      round.player_storyteller,
      player.game_slug
    );

    // STORYTELLER SCORING
    if (player.player_id === round.player_storyteller) {
      // Get votes for this round
      let votesForStoryteller = 0;
      for (let vote of votes) {
        if (vote.submitter_player_games_id === player.player_games_id) {
          votesForStoryteller++;
        }
      }

      if (votesForStoryteller >= 1 && votesForStoryteller < votes.length) {
        score += 3;
      }
    } else {
      // NON-STORYTELLER SCORING
      let votesForPlayer = 0;
      let didPlayerVoteForStoryteller = false;
      for (let vote of votes) {
        if (vote.submitter_player_games_id === player.player_games_id) {
          votesForPlayer++;
        }

        // Check if player voted for storyteller
        if (vote.voter_player_games_id === player.player_games_id) {
          if (vote.submitter_player_games_id === storytellerPlayer.id) {
            didPlayerVoteForStoryteller = true;
          }
        }
      }

      if (votesForPlayer >= 1) {
        score += votesForPlayer;
      }

      if (didPlayerVoteForStoryteller) {
        score += 3;
      }
    }
  }
  return score;
};

const handleScore = async (game) => {
  const players = await db.getPlayersInGame(game);
  const rounds = await db.getRounds(game);
  const completedRounds = rounds.filter((round) => round.completed_at !== null);
  if (completedRounds.length === 0) {
    console.log("No completed rounds");
    // Return 0s
  }
  let playerScores = [];
  for (let player of players) {
    const playerScore = await scorePlayer(player, completedRounds);
    playerScores.push({ playerId: player.player_id, score: playerScore });
  }
  return playerScores;
};

module.exports = {
  handleDeck,
  handleCardSubmissions,
  handleHand,
  handleRound,
  handlePlayers,
  handleScore,
};
