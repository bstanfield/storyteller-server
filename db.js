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

// Players
const insertPlayer = async (player) => db.query('INSERT INTO players (name) VALUES ($1) RETURNING *', [player])
const getPlayer = async (player_id) => db.query('SELECT * FROM players WHERE player_id = $1', [player_id])
const updatePlayer = async (field, value, name) => db.query(`UPDATE players SET ${field} = $1 WHERE name = $2`, [value, name])

// Rooms
const insertRoom = async (slug) => db.query('INSERT INTO rooms (slug) VALUES ($1) RETURNING *', [slug]);
const deleteRoom = async (slug) => db.query('DELETE FROM rooms WHERE slug = $1', [slug]);
const getValidRooms = async () => db.query('SELECT * FROM rooms')
const getOldestRoom = async () => db.query('SELECT * FROM rooms ORDER BY created_at ASC LIMIT 1');





module.exports = {
  db,
  getValidRooms,
  insertPlayer,
  insertRoom,
  getOldestRoom,
  deleteRoom,
  getPlayer,
  updatePlayer
}
