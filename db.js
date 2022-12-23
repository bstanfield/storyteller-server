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
const updatePlayer = async (field, value, playerId) => db.query(`UPDATE players SET ${field} = $1 WHERE player_id = $2`, [value, playerId])
const getPlayersInGame = async (game_slug) => db.query('SELECT * FROM player_games JOIN players ON player_games.player_id = players.player_id JOIN avatars ON players.avatar_id = avatars.id WHERE game_slug = $1', [game_slug])

// Games
const insertGame = async (slug) => db.query('INSERT INTO games (slug) VALUES ($1) RETURNING *', [slug]);
const deleteGame = async (slug) => db.query('DELETE FROM games WHERE slug = $1', [slug]);
const getValidGames = async () => db.query('SELECT * FROM games')
const getOldestGame = async () => db.query('SELECT * FROM games ORDER BY created_at ASC LIMIT 1');

const addPlayerToGame = async (player_id, game_slug) => db.query('INSERT INTO player_games (player_id, game_slug) VALUES ($1, $2) RETURNING *', [player_id, game_slug]);

// Avatars
const getAvatars = async () => db.query('SELECT * FROM avatars');

module.exports = {
  db,
  getValidGames,
  insertPlayer,
  insertGame,
  getOldestGame,
  deleteGame,
  getPlayer,
  updatePlayer,
  insertGame,
  addPlayerToGame,
  getPlayersInGame,
  getAvatars,
}
