/* Replace with your SQL commands */
ALTER TABLE rounds ADD COLUMN completed_at timestamp without time zone;

ALTER TABLE rounds DROP COLUMN IF EXISTS storyteller_id;
ALTER TABLE rounds ADD COLUMN player_storyteller uuid REFERENCES players(player_id);