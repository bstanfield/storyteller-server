const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const db = require("./db");

const port = process.env.PORT || 4001;
const index = require("./routes/index");
const cors = require("cors");
const { camelCase, pickStoryteller } = require("./helpers");

const app = express();
app.use(cors());

app.use(index);

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*",
  },
});

let connectedClients = {};

const getDeck = async (game) => {
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
    }
    ));
  
  // Get all cards not in player hands
  const deck = await db.getCards();
  const cardsInHands = playerHands.map(player => player.hand).flat();
  const remainingCardsInDeck = deck.filter(card => !cardsInHands.find(cardInHand => cardInHand.card_id === card.id));
  console.log('Remaining cards in deck: ', remainingCardsInDeck.length);
  return remainingCardsInDeck;
}

const handleCardSubmissions = async (players, round) => {
  let playersThatHaveSubmitted = (await db.getPlayersWithHandCardWithRoundId(round.id)).map(player => player);
  let playersThatHaveNotSubmitted = [];
  for (let player of players) {
    const submitted = playersThatHaveSubmitted.map(player => player.player_games_id);
    if (!submitted.includes(player.player_games_id)) {
      playersThatHaveNotSubmitted.push(camelCase(player));
    }
  }

  playersThatHaveSubmitted = playersThatHaveSubmitted.map(player => camelCase(player));
  return {
    ...camelCase(round),
    submissions:
    {
      playersThatHaveSubmitted,
      playersThatHaveNotSubmitted
    }
  };
}

// Write a function that takes in a hand and ensures that it always has 7 cards in it
// Todo: Need to be able to shuffle deck when out of cards
const handleHand = async (hand, player_games_id, newRound, deck) => {
  let idealHandSize = 6;
  const cardsInDb = await db.getCards();
  
  // Includes cards that have been played by the player
  const cardsInHand = hand.map(card => {
    return {
      card_id: card.card_id,
      played_at: card.played_at,
      imgix_path: cardsInDb.find(cardInDb => cardInDb.id === card.card_id).imgix_path
    }
  });
  const cardsInHandUnplayed = cardsInHand.filter(card => card.played_at === null);
  if (cardsInHandUnplayed.length === 0) {
    // Get 7 random cards from deck
    const randomCards = [];
    for (let i = 0; i < idealHandSize; i++) {
      let randomIndices = [];
      let randomIndex = Math.floor(Math.random() * deck.length);
      // Keep cycling until you get a non-duplicate index
      while (randomIndices.includes(randomIndex)) {
        randomIndex = Math.floor(Math.random() * deck.length);
      }
      randomCards.push(deck[randomIndex]);
    }
    randomCards.map(card => db.insertHandCard(player_games_id, card.id));
    return randomCards;
  } else if (newRound && cardsInHandUnplayed.length < idealHandSize) {
    // TODO: Update this to use randomIndex
    // If newRound, and there are less than 7 cards in hand, add cards until 6
    const cardsToAdd = idealHandSize - cardsInHand.length;
    const randomCards = [];
    for (let i = 0; i < cardsToAdd; i++) {
      const randomIndex = Math.floor(Math.random() * deck.length);
      randomCards.push(deck[randomIndex]);
    }
    randomCards.map(card => db.insertHandCard(player_games_id, card.id));
    return [...cardsInHandUnplayed, ...randomCards];
  } else {
    return cardsInHandUnplayed; // Only return cards that have not been played yet
  }
}

const handleRound = async (game) => {
  const rounds = await db.getRounds(game);
  const latestRound = rounds[rounds.length - 1];
  if (latestRound?.completed_at === null) {
    const [storyteller] = await db.getPlayer(latestRound.player_storyteller);
    return camelCase({ storyteller, ...latestRound });
  } else {
    // If there is no round, or the round is completed, create a new round
    const players = await db.getPlayersInGame(game);
    const playerIds = players.map((player) => player.player_id);
    const storyteller = pickStoryteller(playerIds, rounds.length);
    const storytellerObj = players.find((player) => player.player_id === storyteller);
    const [round] = await db.insertRound(game, storyteller);
    return camelCase({ storyteller: storytellerObj, ...round });
  }
}

const startSocketServer = async () => {
  io.on("connection", async (socket) => {
    // Assign to game and hand down board
    socket.on("join", async (context) => {
      const { player_id, game } = context;
      // TODO: If game doesn't have a deck yet, create one

      console.log(socket.id, "joining ", game);
      socket.join(game);

      socket.emit("id", socket.id);

      const deck = await getDeck(game);

      // Deal in the newly joined player
      const [playerInGame] = await db.getPlayerInGame(player_id, game);
      const playerHand = await db.getHand(playerInGame.id);
      const updatedPlayerHand = await handleHand(playerHand, playerInGame.id, false, deck);
      socket.emit("hand", updatedPlayerHand);
      
      // Tell everyone who is in the game
      const players = await db.getPlayersInGame(game);
      io.to(game).emit("players", players);
    });

    // Game agnostic code
    // TODO: Add avatar preference
    connectedClients[socket.id] = {
      ...connectedClients[socket.id],
    };

    // When a client starts game, emit to all clients
    socket.on("start", async (data) => {
      const { game } = data;

      // Emit to all clients in game that game has started
      io.in(game).emit("start", true);
    });

    // Every client will listen for "round" data to update their state
    socket.on("round", async (data) => {
      const { game } = data;
      const round = await handleRound(game);
      const players = await db.getPlayersInGame(game);
      const roundAndSubmissionDataToReturn = await handleCardSubmissions(players, round);
      io.in(game).emit("round", roundAndSubmissionDataToReturn);
    });

    // A client will let the server know when a new round is requested
    socket.on("new round", async (data) => {
      const { game } = data;
      const round = await handleRound(game);

      const deck = await getDeck(game);

      // For each player in game, deal in additional cards
      const players = await db.getPlayersInGame(game);
      players.map(async (player) => {
        const playerHand = await db.getHand(player.id);
        const updatedPlayerHand = await handleHand(playerHand, player.id, true, deck);
        io.to(player.id).emit("hand", updatedPlayerHand);
      });

      const roundAndSubmissionDataToReturn = await handleCardSubmissions(players, round);
      io.in(game).emit("round", roundAndSubmissionDataToReturn);
    });

    socket.on("clue", async (data) => { 
      console.log('Player submitted clue: ', data);
      const { game, clue } = data;
    
      const [round] = await db.getRounds(game);
      await db.addClueToRound(round.id, clue);
      io.in(game).emit("clue", clue);
    });

    socket.on("submit card", async (data) => {
      console.log('Player submitted card: ', data);
      // When a player submits a card, update the card to include the round id on which it was played
      const { game, imgixPath, playerId } = data;
      const [round] = await db.getRounds(game);
      const [player] = await db.getPlayer(playerId);
      const [playerInGame] = await db.getPlayerInGame(playerId, game);
      const [card] = await db.getCardByImgixPath(imgixPath);

      // Stamps the card with the round id
      await db.updateHandCardWithRoundId(round.id, playerInGame.id, card.id);

      // Check which players in a game have not submitted a card yet
      const players = await db.getPlayersInGame(game);
      const roundAndSubmissionDataToReturn = await handleCardSubmissions(players, round);

      console.log('submit card return data: ', roundAndSubmissionDataToReturn);

      io.in(game).emit("cardSubmissions", roundAndSubmissionDataToReturn);
    });

    socket.on("disconnect", () => {
      const clientToDelete = connectedClients[socket.id];
      console.log(socket.id, " left ", clientToDelete.game);
      if (clientToDelete) {
        // Check game before deleting
        const game = clientToDelete.game;
        delete connectedClients[socket.id];

        // Count clients in game
        let players = [];
        for (const [key, value] of Object.entries(connectedClients)) {
          if (value.game === game) {
            players.push(value);
          }
        }

      // Tell everyone who is in the game
      // io.to(game).emit("players", players);
      }
    });
  });
};

startSocketServer();

server.listen(port, () => console.log(`Listening on port ${port}`));
