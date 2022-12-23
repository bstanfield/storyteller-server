const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const db = require("./db");

const port = process.env.PORT || 4001;
const index = require("./routes/index");
const cors = require("cors");
const { camelCase, pickStoryteller } = require("./helpers");

const app = express();
app.use(cors());

app.use(index);

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*",
  },
});

let connectedClients = {};

// Write a function that takes in a hand and ensures that it always has 7 cards in it
// Todo: Need to be able to shuffle deck when out of cards
const handleHand = async (hand, player_game_id) => {
  let idealHandSize = 7;
  const cardsInDb = await db.getCards();
  // Includes cards that have been played by the player
  const cardsInHand = hand.map(card => {
    return {
      card_id: card.card_id,
      played_at: card.played_at,
    }
  });
  if (cardsInHand.length === 0) {
    // Get 7 random cards from cardsInDb
    const randomCards = [];
    for (let i = 0; i < idealHandSize; i++) {
      const randomIndex = Math.floor(Math.random() * cardsInDb.length);
      randomCards.push(cardsInDb[randomIndex]);
    }
    randomCards.map(card => db.insertHandCard(player_game_id, card.id));
    return randomCards;
  } else {
    return cardsInHand.filter(card => card.played_at === null); // Only return cards that have not been played yet
  }
}

const startSocketServer = async () => {
  io.on("connection", async (socket) => {
    // Assign to game and hand down board
    socket.on("join", async (context) => {
      const { player_id, game } = context;
      // TODO: If game doesn't have a deck yet, create one

      console.log(socket.id, "joining ", game);
      socket.join(game);

      socket.emit("id", socket.id);

      // Deal in the newly joined player
      const [playerInGame] = await db.getPlayerInGame(player_id, game);
      const playerHand = await db.getHand(playerInGame.id);
      const updatedPlayerHand = await handleHand(playerHand, playerInGame.id);
      socket.emit("hand", updatedPlayerHand);
      
      // Tell everyone who is in the game
      const players = await db.getPlayersInGame(game);
      io.to(game).emit("players", players);
    });

    // Game agnostic code
    // TODO: Add avatar preference
    connectedClients[socket.id] = {
      ...connectedClients[socket.id],
    };

    // When a client starts game, emit to all clients
    socket.on("start", async (data) => {
      const { game } = data;

      // Emit to all clients in game that game has started
      io.in(game).emit("start", true);
    });

    // Every client will listen for "round" data to update their state
    socket.on("round", async (data) => { 
      const { game } = data;
      const rounds = await db.getRounds(game);
      const latestRound = rounds[rounds.length - 1];
      if (latestRound?.completed_at === null) {
        // If there is a round, and it is not completed, send it
        io.in(game).emit("round", camelCase(latestRound));
      } else {
        // If there is no round, or the round is completed, create a new round
        const players = await db.getPlayersInGame(game);
        const playerIds = players.map((player) => player.player_id);
        const storyteller = pickStoryteller(playerIds, rounds.length);
        const [round] = await db.insertRound(game, storyteller);
        io.in(game).emit("round", camelCase(round));
      }
    });

    socket.on("message", async (data) => {
      const { game } = connectedClients[socket.id];
      const { name, type, value } = data;

      // Catch for out-of-sync name
      if (name !== connectedClients[socket.id].name) {
        console.log(name, "is not ", connectedClients[socket.id].name);
        connectedClients[socket.id].name = name;
      }

      // TODO: Change input to guess, etc.
      if (type === "input") {
        try {
          // TODO: Update DB here
          // db.updateGame(game, puzzles[game].guesses, puzzles[game].scores);
        } catch (err) {
          console.log("ERROR: ", err);
        }
      }

      // TODO: Handle new game request
      if (type === "newPuzzle") {
        // Loading state for everyone in game
        io.in(game).emit("loading", true);

        try {
          // TODO: Insert into DB here
        } catch (err) {
          console.log("ERROR: ", err);
        }

        // io.in(game).emit("guesses", puzzles[game].guesses);
        // io.in(game).emit("board", puzzles[game].board);
        // io.in(game).emit("timestamp", puzzles[game].created_at);
        // io.in(game).emit("completed", puzzles[game].completed_at); // might still be null -- that's OK

        io.in(game).emit("loading", false);
      }
    });

    socket.on("disconnect", () => {
      const clientToDelete = connectedClients[socket.id];
      console.log(socket.id, " left ", clientToDelete.game);
      if (clientToDelete) {
        // Check game before deleting
        const game = clientToDelete.game;
        delete connectedClients[socket.id];

        // Count clients in game
        let players = [];
        for (const [key, value] of Object.entries(connectedClients)) {
          if (value.game === game) {
            players.push(value);
          }
        }

      // Tell everyone who is in the game
      // io.to(game).emit("players", players);
      }
    });
  });
};

startSocketServer();

server.listen(port, () => console.log(`Listening on port ${port}`));
