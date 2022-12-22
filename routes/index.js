const express = require("express");
const router = express.Router();
const { getValidRooms, insertRoom, getOldestRoom, deleteRoom, insertPlayer, getPlayer, updatePlayer } = require('../db');

router.get("/", (req, res) => {
  res.send({ response: "I am alive" }).status(200);
});

// Creates a new room
router.get("/create", async (req, res) => {
  const existingRoomSlugs = (await getValidRooms()).map(room => room.slug);

  const generateRandomSlug = (len) => {
    const characters = 'abcdefghijkmnpqrstuvwxyz1234567890';
    let slug = '';
    for (let i = 0; i < len; i++) {
      slug += characters[Math.floor(Math.random() * characters.length)];
    }
    return slug;
  }

  let slug = generateRandomSlug(4);
  // If slug already exists, generate a new one
  while (existingRoomSlugs.includes(slug)) {
    slug = generateRandomSlug(4);
  }

  // Check how many rooms exist
  const numRooms = existingRoomSlugs.length;

  // if there are more than 1,000 rooms, delete the oldest room
  if (numRooms > 1000) {
    console.log('Too many rooms!');
    const oldestRoom = (await getOldestRoom())[0];
    await deleteRoom(oldestRoom.slug);
  }

  await insertRoom(slug);
  res.send({ created: slug, total_rooms: numRooms }).status(200);
});

// Create a route that checks if a player exists
router.get("/session", async (req, res) => {
  const player_id = req.query.player_id;
  
  // Check if player exists in database
  const existingPlayer = await getPlayer(player_id);
  if (existingPlayer.length === 0) {
    return res.send({ error: 'Player does not exist', sent: player_id }).status(404);
  } else {
    return res.send({ sent: player_id }).status(200);
  }
});

// Create a route that creates a new player
router.get("/create/username", async (req, res) => {
  const username = req.query.username?.toLowerCase();
  const newPlayer = (await insertPlayer(username))[0];
  res.send({ created: preferredUsername, player_id: newPlayer.player_id }).status(200);
});

// Create a route that adds an avatar to a user
router.get("/create/avatar", async (req, res) => {
  const username = req.query.username?.toLowerCase();
  const avatar = req.query.avatar;

  // Check if player exists in database
  const existingPlayer = await getPlayer(username);
  if (existingPlayer.length === 0) {
    return res.send({ error: 'Username does not exist', sent: username }).status(404);
  }

  // If there is an existingPlayer, add avatar to database
  await updatePlayer('avatar_id', avatar, username);
  res.send({ created: avatar, username }).status(200);
});
  

// TODO: Rename this to something more appropriate
router.get("/secret", async (req, res) => {
  const room = req.query.room;
  console.log('User is trying to access room: ', room);

  const existingRoomSlugs = (await getValidRooms()).map(room => room.slug);

  if (existingRoomSlugs.includes(room)) {
    return res.send({ sent: room }).status(200);
  }

  res.send({ error: 'Room not valid', sent: room }).status(404);
});

module.exports = router;
