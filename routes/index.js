const express = require("express");
const router = express.Router();
const { getValidKeys } = require('../db');
const {
  findPuzzleBySearchString
} = require("../data");

router.get("/", (req, res) => {
  res.send({ response: "I am alive" }).status(200);
});

router.get("/secret", async (req, res) => {
  const key = req.query.key;

  const validKeys = (await getValidKeys()).map(key => key.name);

  if (validKeys.includes(key)) {
    return res.send({ sent: key }).status(200);
  }

  res.send({ error: 'Key not valid', sent: key }).status(404);
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
