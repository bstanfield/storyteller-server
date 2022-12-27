const dotenv = require("dotenv");
dotenv.config();

const pgp = require("pg-promise")({
  // Init details
});

const cn = process.env.DATABASE_URL;
const testing = process.env.TESTING;

const db = pgp({
  connectionString: cn,
  ssl: testing
    ? false
    : {
        rejectUnauthorized: false,
      },
});

// Players
const insertPlayer = async (player) =>
  db.query("INSERT INTO players (name) VALUES ($1) RETURNING *", [player]);
const getPlayer = async (player_id) =>
  db.query("SELECT * FROM players WHERE player_id = $1", [player_id]);
const updatePlayer = async (field, value, playerId) =>
  db.query(`UPDATE players SET ${field} = $1 WHERE player_id = $2`, [
    value,
    playerId,
  ]);
const getPlayersInGame = async (game_slug) =>
  db.query(
    "SELECT player_games.id as player_games_id, * FROM player_games JOIN players ON player_games.player_id = players.player_id JOIN avatars ON players.avatar_id = avatars.id WHERE game_slug = $1 ORDER BY player_games.created_at DESC",
    [game_slug]
  );
const addPlayerToGame = async (player_id, game_slug) =>
  db.query(
    "INSERT INTO player_games (player_id, game_slug) VALUES ($1, $2) RETURNING *",
    [player_id, game_slug]
  );
const getPlayerInGame = async (player_id, game_slug) =>
  db.query(
    "SELECT * FROM player_games WHERE player_id = $1 AND game_slug = $2",
    [player_id, game_slug]
  );
const getPlayerInGameBySubmittedImage = async (imgix_path, round) =>
  db.query(
    "SELECT player_games_id FROM hands JOIN player_games ON player_games.id = hands.player_games_id JOIN players ON players.player_id = player_games.player_id JOIN cards ON cards.id = hands.card_id WHERE round_id = $1 and cards.imgix_path = $2",
    [round, imgix_path]
  );

// Games
const insertGame = async (slug) =>
  db.query("INSERT INTO games (slug) VALUES ($1) RETURNING *", [slug]);
const deleteGame = async (slug) =>
  db.query("DELETE FROM games WHERE slug = $1", [slug]);
const getValidGames = async () => db.query("SELECT * FROM games");
const getOldestGame = async () =>
  db.query("SELECT * FROM games ORDER BY created_at ASC LIMIT 1");

// Avatars
const getAvatars = async () => db.query("SELECT * FROM avatars");

// Rounds
const insertRound = async (game_slug, storyteller_id) =>
  db.query(
    "INSERT INTO rounds (game_slug, player_storyteller) VALUES ($1, $2) RETURNING *",
    [game_slug, storyteller_id]
  );
const getRounds = async (game_slug) =>
  db.query(
    "SELECT * FROM rounds WHERE game_slug = $1 ORDER BY created_at ASC",
    [game_slug]
  );
const addClueToRound = async (round_id, clue) =>
  db.query("UPDATE rounds SET clue = $1 WHERE id = $2", [clue, round_id]);

// Hands
const getHand = async (player_games_id) =>
  db.query(
    "SELECT * FROM hands JOIN player_games ON player_games.id = hands.player_games_id WHERE player_games_id = $1",
    [player_games_id]
  );
const insertHandCard = async (player_games_id, card_id) =>
  db.query("INSERT INTO hands (player_games_id, card_id) VALUES ($1, $2)", [
    player_games_id,
    card_id,
  ]);
const updateHandCard = async (player_games_id, card_id) =>
  db.query("UPDATE hands SET card_id = $1 WHERE player_games_id = $2", [
    card_id,
    player_games_id,
  ]);
const updateHandCardWithRoundId = async (round_id, player_games_id, card_id) =>
  db.query(
    "UPDATE hands SET round_id = $1, played_at = now() WHERE player_games_id = $2 AND card_id = $3",
    [round_id, player_games_id, card_id]
  );
const getPlayersWithHandCardWithRoundId = async (round_id) =>
  db.query(
    "SELECT * FROM hands JOIN player_games ON player_games.id = hands.player_games_id JOIN players ON players.player_id = player_games.player_id WHERE round_id = $1",
    [round_id]
  );

// Cards
const getCards = async () => db.query("SELECT * FROM cards");
const getCard = async (card_id) =>
  db.query("SELECT * FROM cards WHERE id = $1", [card_id]);
const getCardByImgixPath = async (imgix_path) =>
  db.query("SELECT * FROM cards WHERE imgix_path = $1", [imgix_path]);

// Votes
const getVotes = async (round_id) =>
  db.query("SELECT * FROM votes WHERE round_id = $1", [round_id]);
const addVote = async (
  round_id,
  voter_player_games_id,
  submitter_player_games_id
) =>
  db.query(
    "INSERT INTO votes (round_id, voter_player_games_id, submitter_player_games_id) VALUES ($1, $2, $3)",
    [round_id, voter_player_games_id, submitter_player_games_id]
  );

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
  insertRound,
  getPlayerInGame,
  getRounds,
  getHand,
  insertHandCard,
  updateHandCard,
  getCards,
  addClueToRound,
  updateHandCardWithRoundId,
  getPlayersWithHandCardWithRoundId,
  getCardByImgixPath,
  getCard,
  getVotes,
  addVote,
  getPlayerInGameBySubmittedImage,
};
