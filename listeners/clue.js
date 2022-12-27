const db = require("../db");
const h = require("../handlers");

const clueListener = async (io, socket, data) => {
  const { game, clue } = data;
  const [round] = await db.getRounds(game);
  await db.addClueToRound(round.id, clue);
  io.in(game).emit("clue", clue);
};

module.exports = clueListener;
