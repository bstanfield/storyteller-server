const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { getValidRooms } = require("./db");

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

const randomColors = ['red', 'green', 'blue'];
let assignedColors = 0;
let connectedClients = {};

const startSocketServer = async () => {
  let puzzles = {};

  const validRooms = (await getValidRooms()).map((room) => room.name);

  io.on("connection", async (socket) => {
    console.log("New client: ", socket.id);

    // Assign to room and hand down board
    socket.on("join", async (room) => {
      // Reject invalid rooms
      if (!validRooms.includes(room)) {
        return socket.emit("reject", "invalid room");
      }

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
        ...{ room, name: "Anon" },
      };

      // TODO: Add client to DB

      // Count clients in room
      let count = 0;
      for (const [key, value] of Object.entries(connectedClients)) {
        if (value.room === room) {
          count++;
        }
      }

      // Tell everyone in the room about the new client
      io.to(room).emit("newPlayer", count);
    });

    socket.on("name", (name) => {
      if (name) {
        console.log(socket.id, " name is ", name);
        connectedClients[socket.id] = {
          ...connectedClients[socket.id],
          ...{ name },
        };
      }
    });

    // Room agnostic code
    // Assigns a color for the client
    // TODO: Convert from color to avatar
    connectedClients[socket.id] = {
      ...connectedClients[socket.id],
      ...{ color: randomColors[assignedColors] },
    };
    assignedColors++;

    if (assignedColors >= randomColors.length) {
      assignedColors = 0;
    }

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

        // Recount clients in room
        let count = 0;
        for (const [key, value] of Object.entries(connectedClients)) {
          if (value.room === room) {
            count++;
          }
        }
        io.to(room).emit("newPlayer", count);
      }
    });
  });
};

startSocketServer();

server.listen(port, () => console.log(`Listening on port ${port}`));
