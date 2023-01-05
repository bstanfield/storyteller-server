const camelize = require("camelize");
const db = require("../db");
const { camelCase } = require("../helpers");

const initJoinListener = async (io, socket, data) => {
  const { player_id, game } = data;

  console.log(socket.id, "initial joining ", game);
  socket.join(game);

  socket.emit("id", socket.id);

  // Tell everyone who is in the game
  // Get players in game
  const players = await db.getPlayersInGame(game);
  io.to(game).emit("players", camelize(players));
};

module.exports = initJoinListener;
