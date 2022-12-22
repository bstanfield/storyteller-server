const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { getValidRooms, insertGame } = require("./db");

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
  let puzzles = {};

  const validRooms = (await getValidRooms()).map((room) => room.name);

  io.on("connection", async (socket) => {
    console.log("New client: ", socket.id);

    // Assign to room and hand down board
    socket.on("join", async (context) => {
      const { player_id, room } = context;
      // TODO: If room doesn't have a deck yet, create one

      // Send stuff down to new client
      console.log(socket.id, "joining ", room);
      socket.join(room);


      // TODO: Emit pertinent data to client
      // socket.emit("board", puzzles[room].board);
      // socket.emit("guesses", puzzles[room].guesses);
      // socket.emit("scores", puzzles[room].scores);

      socket.emit("id", socket.id);
      // socket.emit("timestamp", puzzles[room].created_at);
      // console.log("Sending completed_at: ", puzzles[room].completed_at);
      // socket.emit("completed", puzzles[room].completed_at);

      // Add client to list of clients
      connectedClients[socket.id] = {
        ...connectedClients[socket.id],
        ...{ room, name: "Anon", player_id },
      };

      // TODO: Add client to DB

      // Count clients in room
      let players = [];
      console.log('connected clients: ', connectedClients);
      for (const [key, value] of Object.entries(connectedClients)) {
        if (value.room === room) {
          players.push(value);
        }
      }

      // Tell everyone who is in the room
      io.to(room).emit("players", players);
    });

    // Room agnostic code
    // TODO: Add avatar preference
    connectedClients[socket.id] = {
      ...connectedClients[socket.id],
    };

    // When a client starts game, add to db and emit to all clients in room
    socket.on("start game", async (data) => {
      const { room } = data;
      
      // Add new game to db
      await insertGame(room);

      // Emit to all clients in room that game has started
      io.in(room).emit("start", true);
    });

    
    
    
    socket.on("message", async (data) => {
      const { room } = connectedClients[socket.id];
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
          // db.updateGame(room, puzzles[room].guesses, puzzles[room].scores);
        } catch (err) {
          console.log("ERROR: ", err);
        }
      }

      // TODO: Handle new game request
      if (type === "newPuzzle") {
        // Loading state for everyone in room
        io.in(room).emit("loading", true);

        try {
          // TODO: Insert into DB here
        } catch (err) {
          console.log("ERROR: ", err);
        }

        // io.in(room).emit("guesses", puzzles[room].guesses);
        // io.in(room).emit("board", puzzles[room].board);
        // io.in(room).emit("timestamp", puzzles[room].created_at);
        // io.in(room).emit("completed", puzzles[room].completed_at); // might still be null -- that's OK

        io.in(room).emit("loading", false);
      }
    });

    socket.on("disconnect", () => {
      const clientToDelete = connectedClients[socket.id];
      console.log(socket.id, " left ", clientToDelete.room);
      if (clientToDelete) {
        // Check room before deleting
        const room = clientToDelete.room;
        delete connectedClients[socket.id];

        // Count clients in room
        let players = [];
        console.log('connected clients: ', connectedClients);
        for (const [key, value] of Object.entries(connectedClients)) {
          if (value.room === room) {
            players.push(value);
          }
        }

      // Tell everyone who is in the room
      io.to(room).emit("players", players);
      }
    });
  });
};

startSocketServer();

server.listen(port, () => console.log(`Listening on port ${port}`));
