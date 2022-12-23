const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { getValidGames, insertGame } = require("./db");

const port = process.env.PORT || 4001;
const index = require("./routes/index");
const cors = require("cors");

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
    console.log("New client: ", socket.id);

    // Assign to game and hand down board
    socket.on("join", async (context) => {
      const { player_id, game } = context;
      // TODO: If game doesn't have a deck yet, create one

      // Send stuff down to new client
      console.log(socket.id, "joining ", game);
      socket.join(game);


      // TODO: Emit pertinent data to client
      // socket.emit("board", puzzles[game].board);
      // socket.emit("guesses", puzzles[game].guesses);
      // socket.emit("scores", puzzles[game].scores);

      socket.emit("id", socket.id);
      // socket.emit("timestamp", puzzles[game].created_at);
      // console.log("Sending completed_at: ", puzzles[game].completed_at);
      // socket.emit("completed", puzzles[game].completed_at);

      // Add client to list of clients
      connectedClients[socket.id] = {
        ...connectedClients[socket.id],
        ...{ game, name: "Anon", player_id },
      };

      // TODO: Add client to DB

      // Count clients in game
      let players = [];
      for (const [key, value] of Object.entries(connectedClients)) {
        if (value.game === game) {
          players.push(value);
        }
      }

      // Tell everyone who is in the game
      io.to(game).emit("players", players);
    });

    // Game agnostic code
    // TODO: Add avatar preference
    connectedClients[socket.id] = {
      ...connectedClients[socket.id],
    };

    // When a client starts game, add to db and emit to all clients in game
    socket.on("start game", async (data) => {
      const { game } = data;
      
      // Add new game to db
      await insertGame(game);

      // Emit to all clients in game that game has started
      io.in(game).emit("start", true);
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
      io.to(game).emit("players", players);
      }
    });
  });
};

startSocketServer();

server.listen(port, () => console.log(`Listening on port ${port}`));
