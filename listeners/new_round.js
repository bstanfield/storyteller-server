const db = require("../db");
const h = require("../handlers");
const { camelCase } = require("../helpers");

const newRoundListener = async (io, socket, data) => {
  console.log("NEW ROUND TRIGGERED!");
  const { game } = data;
  const deck = await h.handleDeck(game);

  const roundAndSubmissionDataToReturn = await h.handleCardSubmissions(game);

  // For each player in game, deal in additional cards
  const players = await h.handlePlayers(game);
  console.log("players: ", players);
  const updatedPlayerHands = await Promise.all(
    players.map(async (player) => {
      const playerHand = await db.getHand(player.playerGamesId);
      const updatedPlayerHand = await h.handleHand(
        playerHand,
        player.playerGamesId,
        true,
        deck,
        players
      );
      return {
        playerId: player.playerId,
        hand: updatedPlayerHand.map((card) => camelCase(card)),
      };
    })
  );

  io.in(game).emit("fresh hands", updatedPlayerHands);

  io.in(game).emit("players", players);
  io.in(game).emit("round", roundAndSubmissionDataToReturn);
};

module.exports = newRoundListener;
