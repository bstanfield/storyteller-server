const db = require("../db");
const h = require("../handlers");

const roundListener = async (io, socket, data) => {
  const { game } = data;
  const roundAndSubmissionDataToReturn = await h.handleCardSubmissions(game);
  const players = await h.handlePlayers(game);

  io.in(game).emit("players", players);
  console.log(
    "roundAndSubmissionDataToReturn: ",
    roundAndSubmissionDataToReturn
  );
  io.in(game).emit("round", roundAndSubmissionDataToReturn);
};

module.exports = roundListener;
