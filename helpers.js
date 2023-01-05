const db = require("./db");

// Write a function that takes in an object and returns an object with all key values in camelCase. The function should be able to handle nested objects and arrays.
const camelCase = (obj) => {
  const output = Object.keys(obj).reduce((acc, key) => {
    const value = obj[key];
    const newKey = key.replace(/([-_][a-z])/gi, ($1) => {
      return $1.toUpperCase().replace("-", "").replace("_", "");
    });
    if (value === Object(value)) {
      acc[newKey] = camelCase(value);
    } else {
      acc[newKey] = value;
    }
    return acc;
  }, {});
  return output;
};

const pickStoryteller = async (game) => {
  const playersInGame = await db.getPlayersInGame(game);
  const rounds = await db.getRounds(game);

  if (rounds.length === 0) {
    return playersInGame[0].player_id;
  }

  const latestRound = rounds[0];
  const storyteller = latestRound.player_storyteller;
  const storytellerIndex = playersInGame.findIndex(
    (player) => player.player_id === storyteller
  );
  const nextStorytellerIndex =
    storytellerIndex === playersInGame.length - 1 ? 0 : storytellerIndex + 1;
  const nextStoryteller = playersInGame[nextStorytellerIndex].player_id;
  return nextStoryteller;
};

module.exports = {
  camelCase,
  pickStoryteller,
};
