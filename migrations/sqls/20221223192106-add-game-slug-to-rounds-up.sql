ALTER TABLE rounds DROP COLUMN IF EXISTS game_id;
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS game_slug text;
ALTER TABLE rounds ADD CONSTRAINT rounds_game_slug_fkey FOREIGN KEY (game_slug) REFERENCES games(slug);
