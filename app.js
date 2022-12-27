const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const db = require("./db");

const port = process.env.PORT || 4001;
const index = require("./routes/index");
const cors = require("cors");
const { camelCase, pickStoryteller } = require("./helpers");
const {
  handleDeck,
  handleCardSubmissions,
  handlePlayers,
  handleHand,
  handleRound,
} = require("./handlers");

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
    // Assign to game and hand down board
    socket.on("join", async (context) => {
      const { player_id, game } = context;
      // TODO: If game doesn't have a deck yet, create one

      console.log(socket.id, "joining ", game);
      socket.join(game);

      socket.emit("id", socket.id);

      const deck = await handleDeck(game);

      // Deal in the newly joined player
      const [playerInGame] = await db.getPlayerInGame(player_id, game);
      const playerHand = await db.getHand(playerInGame.id);
      const updatedPlayerHand = await handleHand(
        playerHand,
        playerInGame.id,
        false,
        deck
      );
      socket.emit("hand", updatedPlayerHand);

      // Tell everyone who is in the game
      const players = await handlePlayers(game);
      io.to(game).emit("players", players);
    });

    // Game agnostic code
    connectedClients.push(socket.id);

    // When a client starts game, emit to all clients
    socket.on("start", async (data) => {
      const { game } = data;

      // Emit to all clients in game that game has started
      io.in(game).emit("start", true);
    });

    // Every client will listen for "round" data to update their state
    socket.on("round", async (data) => {
      const { game } = data;
      const roundAndSubmissionDataToReturn = await handleCardSubmissions(game);
      const players = await handlePlayers(game);

      io.in(game).emit("players", players);
      io.in(game).emit("round", roundAndSubmissionDataToReturn);
    });

    // A client will let the server know when a new round is requested
    socket.on("new round", async (data) => {
      const { game } = data;
      const deck = await handleDeck(game);

      // For each player in game, deal in additional cards
      const players = await handlePlayers(game);
      players.map(async (player) => {
        const playerHand = await db.getHand(player.id);
        const updatedPlayerHand = await handleHand(
          playerHand,
          player.id,
          true,
          deck
        );
        io.to(player.id).emit("hand", updatedPlayerHand);
      });

      const roundAndSubmissionDataToReturn = await handleCardSubmissions(game);

      io.in(game).emit("players", players);
      io.in(game).emit("round", roundAndSubmissionDataToReturn);
    });

    socket.on("clue", async (data) => {
      const { game, clue } = data;

      const [round] = await db.getRounds(game);
      await db.addClueToRound(round.id, clue);
      io.in(game).emit("clue", clue);
    });

    socket.on("submit card", async (data) => {
      // When a player submits a card, update the card to include the round id on which it was played
      const { game, imgixPath, playerId } = data;
      const [round] = await db.getRounds(game);
      const [playerInGame] = await db.getPlayerInGame(playerId, game);
      const [card] = await db.getCardByImgixPath(imgixPath);

      // Stamps the card with the round id
      await db.updateHandCardWithRoundId(round.id, playerInGame.id, card.id);

      const roundAndSubmissionDataToReturn = await handleCardSubmissions(game);
      const players = await handlePlayers(game);

      io.in(game).emit("players", players);
      io.in(game).emit("round", roundAndSubmissionDataToReturn);
    });

    socket.on("submit vote", async (data) => {
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
      // TODO: Don't allow ppl to vote for themselves, and to vote more than once
      // console.log('Placing vote...');
      const vote = await db.addVote(
        round.id,
        playerGameIdThatVoted,
        playerGameIdThatReceivedVote
      );

      // Ensure this can handle votes
      const roundAndSubmissionDataToReturn = await handleCardSubmissions(game);
      // console.log('Now that the vote is in, here is the round data: ', roundAndSubmissionDataToReturn);
      const players = await handlePlayers(game);

      console.log("And here are the players: ", players);

      io.in(game).emit("players", players);
      io.in(game).emit("round", roundAndSubmissionDataToReturn);
    });

    socket.on("disconnect", () => {
      console.log("client is disconnecting: ", socket.id);
      const clientToDelete = connectedClients.indexOf(socket.id);
      if (clientToDelete > -1) {
        connectedClients.splice(clientToDelete, 1);
        console.log("remaining clients: ", connectedClients.length);

        // Count clients in game

        // Tell everyone who is in the game
        // io.to(game).emit("players", players);
        // TODO: Use this area to update player state to offline
      }
    });
  });
};

startSocketServer();

server.listen(port, () => console.log(`Listening on port ${port}`));

process.on("warning", (e) => console.warn(e.stack));
