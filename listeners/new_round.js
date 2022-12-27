const db = require("../db");
const h = require("../handlers");

const newRoundListener = async (io, socket, data) => {
  const { game } = data;
  const deck = await h.handleDeck(game);

  // For each player in game, deal in additional cards
  const players = await h.handlePlayers(game);
  players.map(async (player) => {
    const playerHand = await db.getHand(player.id);
    const updatedPlayerHand = await h.handleHand(
      playerHand,
      player.id,
      true,
      deck
    );
    io.to(player.id).emit("hand", updatedPlayerHand);
  });

  const roundAndSubmissionDataToReturn = await h.handleCardSubmissions(game);

  io.in(game).emit("players", players);
  io.in(game).emit("round", roundAndSubmissionDataToReturn);
};

module.exports = newRoundListener;
