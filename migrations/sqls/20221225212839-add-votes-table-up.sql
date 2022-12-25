/* Replace with your SQL commands */
CREATE TABLE votes (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    round_id integer REFERENCES rounds(id),
    voter_player_games_id integer REFERENCES player_games(id),
    submitter_player_games_id integer REFERENCES player_games(id),
    created_at timestamp without time zone DEFAULT now()
);

-- Indices -------------------------------------------------------

CREATE UNIQUE INDEX votes_pkey ON votes(id int4_ops);