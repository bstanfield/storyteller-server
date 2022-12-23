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
}

const pickStoryteller = (players, roundNumber) => players[roundNumber % players.length];

module.exports = {
  camelCase,
  pickStoryteller,
};
