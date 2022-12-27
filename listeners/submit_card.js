const db = require("../db");
const h = require("../handlers");

const submitCardListener = async (io, socket, data) => {
  // When a player submits a card, update the card to include the round id on which it was played
  const { game, imgixPath, playerId } = data;
  const [round] = await db.getRounds(game);
  const [playerInGame] = await db.getPlayerInGame(playerId, game);
  const [card] = await db.getCardByImgixPath(imgixPath);

  // Stamps the card with the round id
  await db.updateHandCardWithRoundId(round.id, playerInGame.id, card.id);

  const roundAndSubmissionDataToReturn = await h.handleCardSubmissions(game);
  const players = await h.handlePlayers(game);

  io.in(game).emit("players", players);
  io.in(game).emit("round", roundAndSubmissionDataToReturn);
};

module.exports = submitCardListener;
