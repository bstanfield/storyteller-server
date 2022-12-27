const db = require("../db");
const handlers = require("../handlers");

const startListener = async (io, socket, data) => {
  const { game } = data;
  io.in(game).emit("start", true);
};

module.exports = startListener;
