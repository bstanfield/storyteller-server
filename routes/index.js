const express = require("express");
const router = express.Router();
const db = require("../db");
const { camelCase } = require("../helpers");

router.get("/", (req, res) => {
  res.send({ response: "I am alive" }).status(200);
});

// Creates a new game
router.get("/create", async (req, res) => {
  console.log("New game request!");
  const existingGameSlugs = (await db.getValidGames()).map((game) => game.slug);

  const generateRandomSlug = (len) => {
    const characters = "ABCDEFGHJKMNOPQRSTUVWXYZ1234567890";
    let slug = "";
    for (let i = 0; i < len; i++) {
      slug += characters[Math.floor(Math.random() * characters.length)];
    }
    return slug;
  };

  let slug = generateRandomSlug(4);
  // If slug already exists, generate a new one
  while (existingGameSlugs.includes(slug)) {
    slug = generateRandomSlug(4);
  }

  // Check how many games exist
  const numGames = existingGameSlugs.length;

  // if there are more than 1,000 games, delete the oldest game
  if (numGames > 1000) {
    console.log("Too many games!");
    const oldestGame = (await db.getOldestGame())[0];
    await db.deleteGame(oldestGame.slug);
  }

  await db.insertGame(slug);

  console.log("Inserted game!");
  res.send({ slug, total_games: numGames }).status(200);
});

// Create a route that checks if a player exists
router.get("/session", async (req, res) => {
  const player_id = req.query.player_id;

  // Check if player exists in database
  const existingPlayer = await db.getPlayer(player_id);
  if (existingPlayer.length === 0) {
    return res
      .send({ error: "Player does not exist", sent: player_id })
      .status(404);
  } else {
    return res.send({ sent: player_id }).status(200);
  }
});

// Create a route that creates a new player
router.get("/create/username", async (req, res) => {
  console.log("Creating new player ", req.query.username);
  const username = req.query.username?.toLowerCase();
  const newPlayer = (await db.insertPlayer(username))[0];
  res.send({ username, player_id: newPlayer.player_id }).status(200);
});

// Create a route that adds an avatar to a user
router.get("/create/avatar", async (req, res) => {
  const playerId = req.query.player_id;
  const avatar = req.query.avatar_id;

  // If there is an existingPlayer, add avatar to database
  await db.updatePlayer("avatar_id", avatar, playerId);
  res.send({ created: avatar, playerId }).status(200);
});

// Create a route that gets avatars
router.get("/avatars", async (req, res) => {
  const game = req.query.game;
  const avatars = await db.getAvailableAvatars(game);
  res.send({ avatars: avatars.map((avatar) => camelCase(avatar)) }).status(200);
});

router.get("/game/add-player", async (req, res) => {
  const game = req.query.game_slug;
  const player_id = req.query.player_id;

  console.log("Adding player, " + player_id + ", to game, " + game + ".");

  try {
    // Get players in game
    const players = await db.getPlayersInGame(game);
    // Check if player is already in game
    if (players.map((player) => player.player_id).includes(player_id)) {
      console.log("Player already in game");
      return res
        .send({ error: "Player already in game", sent: player_id })
        .status(400);
    } else {
      await db.addPlayerToGame(player_id, game);
    }
  } catch (err) {
    console.log("Error adding player to game: ", err);
    return res
      .send({ error: "Error adding player to game", sent: player_id })
      .status(500);
  }
  res.send({ added: player_id, game }).status(200);
});

// TODO: Finish  this
router.get("/game/players", async (req, res) => {
  const game = req.query.game_slug;
  console.log("Getting players in game: ", game);

  const players = await db.getPlayersInGame(game);
  res.send({ players }).status(200);
});

// TODO: Rename this to something more appropriate
router.get("/secret", async (req, res) => {
  const game = req.query.game;
  console.log("User is trying to access game: ", game);

  const existingGameSlugs = (await db.getValidGames()).map((game) =>
    game.slug.toLowerCase()
  );

  if (existingGameSlugs.includes(game.toLowerCase())) {
    return res.send({ sent: game }).status(200);
  }

  res.send({ error: "Game not valid", sent: game }).status(404);
});

module.exports = router;
