const express = require("express");
const router = express.Router();
const { getValidRooms, insertRoom, getOldestRoom, deleteRoom } = require('../db');

router.get("/", (req, res) => {
  res.send({ response: "I am alive" }).status(200);
});

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
