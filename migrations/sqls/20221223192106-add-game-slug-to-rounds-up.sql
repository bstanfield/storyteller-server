/* Replace with your SQL commands ?? */
/* Rename column game_id to game_slug in table rounds */
ALTER TABLE rounds RENAME COLUMN IF EXISTS game_id TO game_slug;
/* Recast column game_slug to type text */
ALTER TABLE rounds ALTER COLUMN game_slug TYPE text;
/* Assign foreign key games.slug to column game_slug in table rounds */
ALTER TABLE rounds ADD CONSTRAINT rounds_game_slug_fkey FOREIGN KEY (game_slug) REFERENCES games(slug);