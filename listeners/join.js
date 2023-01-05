const db = require("../db");
const h = require("../handlers");
const { camelCase } = require("../helpers");

const joinListener = async (io, socket, data) => {
  const { player_id, game } = data;
  // TODO: If game doesn't have a deck yet, create one

  console.log(socket.id, "joining ", game);
  socket.join(game);

  socket.emit("id", socket.id);

  // If the game hasn't started yet, ignore some of this stuff

  const deck = await h.handleDeck(game);

  // Deal in the newly joined player
  const players = await h.handlePlayers(game);
  const [playerInGame] = await db.getPlayerInGame(player_id, game);
  const playerHand = await db.getHand(playerInGame.id);
  const updatedPlayerHand = await h.handleHand(
    playerHand,
    playerInGame.id,
    false,
    deck,
    players
  );
  socket.emit(
    "hand",
    updatedPlayerHand.map((card) => camelCase(card))
  );

  // Tell everyone who is in the game
  io.to(game).emit("players", players);
};

module.exports = joinListener;
