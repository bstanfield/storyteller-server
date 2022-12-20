const express = require("express");
const router = express.Router();
const { getValidRooms } = require('../db');
const {
  findPuzzleBySearchString
} = require("../data");

router.get("/", (req, res) => {
  res.send({ response: "I am alive" }).status(200);
});

router.get("/secret", async (req, res) => {
  const room = req.query.room;

  const validRooms = (await getValidRooms()).map(room => room.name);

  if (validRooms.includes(room)) {
    return res.send({ sent: room }).status(200);
  }

  res.send({ error: 'Room not valid', sent: room }).status(404);
});

router.get("/search", async (req, res) => {
  const string = req.query.string;

  console.log('searching for ', string);

  const relevantPuzzlesBasedOnSearch = await findPuzzleBySearchString(string);
  const filteredPuzzles = relevantPuzzlesBasedOnSearch.matches.reduce((previous, current) => {
    if (!previous) {
      return [current];
    }
    // If the current date shows up in previous dates, skip.
    if (previous.filter(cw => cw.date === current.date).length > 0) {
      return previous;
    } else {
      previous.push(current);
      return previous;
    }
  }, false);

  res.send({ puzzles: filteredPuzzles }).status(200);
})

module.exports = router;
