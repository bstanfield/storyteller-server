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

const getOldestRoom = async () => db.query('SELECT * FROM rooms ORDER BY created_at ASC LIMIT 1');

const deleteRoom = async (slug) => db.query('DELETE FROM rooms WHERE slug = $1', [slug]);

const getValidRooms = async () => db.query('SELECT * FROM rooms')

const addPlayer = async (player) => db.query('INSERT INTO players (name) VALUES ($1) RETURNING *', [player])

const insertRoom = async (slug) => db.query('INSERT INTO rooms (slug) VALUES ($1) RETURNING *', [slug]);


module.exports = {
  db,
  getValidRooms,
  addPlayer,
  insertRoom,
  getOldestRoom,
  deleteRoom
}
