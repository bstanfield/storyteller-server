const db = require("../db");
const h = require("../handlers");

const submitVoteListener = async (io, socket, data) => {
  console.log("Player submitted vote: ", data);
  const { game, playerId, imagePath } = data;
  const [round] = await db.getRounds(game);

  const [playerThatVotedObj] = await db.getPlayerInGame(playerId, game);
  const playerGameIdThatVoted = playerThatVotedObj.id;
  // Using imagePath, find playerGameId of player that received vote
  const [player] = await db.getPlayerInGameBySubmittedImage(
    imagePath,
    round.id
  );
  const playerGameIdThatReceivedVote = player?.player_games_id;

  // Add vote to db
  const vote = await db.addVote(
    round.id,
    playerGameIdThatVoted,
    playerGameIdThatReceivedVote,
    imagePath
  );

  const roundAndSubmissionDataToReturn = await h.handleCardSubmissions(game);
  const players = await h.handlePlayers(game);

  io.in(game).emit("players", players);
  io.in(game).emit("round", roundAndSubmissionDataToReturn);
};

module.exports = submitVoteListener;
