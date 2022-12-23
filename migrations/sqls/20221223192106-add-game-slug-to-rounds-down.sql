/* Replace with your SQL commands */
/* Rename column game_slug to game_id in table rounds */
ALTER TABLE rounds RENAME COLUMN IF EXISTS game_slug TO game_id;
/* Recast column game_id to type integer */
ALTER TABLE rounds ALTER COLUMN game_id TYPE integer;
/* Assign foreign key games.id to column game_id in table rounds */
ALTER TABLE rounds ADD CONSTRAINT rounds_game_id_fkey FOREIGN KEY (game_id) REFERENCES games(id);