const db = require("../db");
const h = require("../handlers");

const clueListener = async (io, socket, data) => {
  const { game, clue } = data;
  const [round] = await db.getRounds(game);
  console.log("adding clue to db: ", round.id, clue);
  await db.addClueToRound(round.id, clue);
  console.log("emitting clue: ", clue);
  io.in(game).emit("clue", clue);
};

module.exports = clueListener;
