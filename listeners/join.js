const db = require("../db");
const h = require("../handlers");

const joinListener = async (io, socket, data) => {
  console.log("user is joining!");
  const { player_id, game } = data;
  // TODO: If game doesn't have a deck yet, create one

  console.log(socket.id, "joining ", game);
  socket.join(game);

  socket.emit("id", socket.id);

  const deck = await h.handleDeck(game);

  // Deal in the newly joined player
  const [playerInGame] = await db.getPlayerInGame(player_id, game);
  const playerHand = await db.getHand(playerInGame.id);
  console.log("updating player hand, new round: ", false);
  const updatedPlayerHand = await h.handleHand(
    playerHand,
    playerInGame.id,
    false,
    deck
  );
  socket.emit("hand", updatedPlayerHand);

  // Tell everyone who is in the game
  const players = await h.handlePlayers(game);
  io.to(game).emit("players", players);
};

module.exports = joinListener;
