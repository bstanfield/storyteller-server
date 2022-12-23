ALTER TABLE rounds DROP COLUMN IF EXISTS game_slug;
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS game_id integer;
ALTER TABLE rounds ADD CONSTRAINT rounds_game_slug_fkey FOREIGN KEY (game_id) REFERENCES games(id);
