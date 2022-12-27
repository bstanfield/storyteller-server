const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const requireDir = require("require-dir");
const listeners = requireDir("./listeners");

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

let connectedClients = [];

const startSocketServer = async () => {
  io.on("connection", async (socket) => {
    // Game agnostic client list
    connectedClients.push(socket.id);

    // LISTENERS ------------------------
    socket.on("join", async (data) => {
      await listeners.join(io, socket, data);
    });

    // When a client starts game, emit to all clients
    socket.on("start", async (data) => {
      await listeners.start(io, socket, data);
    });

    // Every client will listen for "round" data to update their state
    socket.on("round", async (data) => {
      await listeners.round(io, socket, data);
    });

    // A client will let the server know when a new round is requested
    socket.on("new round", async (data) => {
      await listeners.new_round(io, socket, data);
    });

    socket.on("clue", async (data) => {
      await listeners.clue(io, socket, data);
    });

    socket.on("submit card", async (data) => {
      await listeners.submit_card(io, socket, data);
    });

    socket.on("submit vote", async (data) => {
      await listeners.submit_vote(io, socket, data);
    });

    socket.on("disconnect", () => {
      console.log("client is disconnecting: ", socket.id);
      const clientToDelete = connectedClients.indexOf(socket.id);
      if (clientToDelete > -1) {
        connectedClients.splice(clientToDelete, 1);
        console.log("remaining clients: ", connectedClients.length);

        // TODO: Use this area to update player state to offline
      }
    });
  });
};

startSocketServer();

server.listen(port, () => console.log(`Listening on port ${port}`));

process.on("warning", (e) => console.warn(e.stack));
