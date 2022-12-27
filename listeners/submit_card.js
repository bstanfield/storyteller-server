const db = require("../db");
const h = require("../handlers");

const submitCardListener = async (io, socket, data) => {
  // When a player submits a card, update the card to include the round id on which it was played
  const { game, imgixPath, playerId } = data;
  const [round] = await db.getRounds(game);
  const [playerInGame] = await db.getPlayerInGame(playerId, game);
  const [card] = await db.getCardByImgixPath(imgixPath);

  // Check if the player has already submitted a card
  // const playersThatHaveSubmitted = await db.getPlayersWithHandCardWithRoundId(
  //   round.id
  // );
  // console.log("playersThatHaveSubmitted: ", playersThatHaveSubmitted);
  // const playerHasAlreadySubmitted = playersThatHaveSubmitted.some(
  //   (player) => player.player_games_id === playerInGame.id
  // );

  // if (playerHasAlreadySubmitted) {
  //   // TODO: Disable this to allow 3-player mode
  //   console.log("Player already submitted a card");
  //   return;
  // }

  // Stamps the card with the round id
  await db.updateHandCardWithRoundId(round.id, playerInGame.id, card.id);

  const roundAndSubmissionDataToReturn = await h.handleCardSubmissions(game);
  const players = await h.handlePlayers(game);

  io.in(game).emit("players", players);
  io.in(game).emit("round", roundAndSubmissionDataToReturn);
};

module.exports = submitCardListener;
