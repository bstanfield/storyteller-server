const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { getPlayersInGame, insertRound, getPlayerInGame, getLatestRound } = require("./db");

const port = process.env.PORT || 4001;
const index = require("./routes/index");
const cors = require("cors");
const { camelCase } = require("./helpers");

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

const startSocketServer = async () => {
  io.on("connection", async (socket) => {
    // Assign to game and hand down board
    socket.on("join", async (context) => {
      const { player_id, game } = context;
      // TODO: If game doesn't have a deck yet, create one

      console.log(socket.id, "joining ", game);
      socket.join(game);

      socket.emit("id", socket.id);

      const players = await getPlayersInGame(game);

      // Tell everyone who is in the game
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

    // Every client will request "round" data to update their state
    socket.on("round", async (data) => { 
      const { game } = data;

      // First, check for active round in game
      const latestRound = await getLatestRound(game);
      if (latestRound.length > 0 && latestRound.completed_at === null) {
        io.in(game).emit("round", camelCase(latestRound));
      } else {
        const players = await getPlayersInGame(game);
        console.log('player: ', players[0].player_id);
        // TODO: *Randomly* select a storyteller
        const storyteller = (await getPlayerInGame(players[0].player_id, game))[0];
        const [round] = await insertRound(game, storyteller.player_id);

        
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
