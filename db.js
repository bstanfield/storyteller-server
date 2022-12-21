const dotenv = require('dotenv');
dotenv.config();

const pgp = require('pg-promise')({
  // Init details
});

const cn = process.env.DATABASE_URL;
const testing = process.env.TESTING;

const db = pgp({
  connectionString: cn,
  ssl: testing
    ? false
    : {
      rejectUnauthorized: false
    },
});

const getValidRooms = async () => db.query('SELECT * FROM rooms')

const addPlayer = async (player) => db.query('INSERT INTO players (name) VALUES ($1) RETURNING *', [player])


module.exports = {
  db,
  getValidRooms,
  addPlayer
}
