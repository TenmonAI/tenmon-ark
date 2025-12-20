-- TENMON-ARK Persona State Schema (SQLite)

CREATE TABLE IF NOT EXISTS persona_state (
  persona_id TEXT PRIMARY KEY,
  tone_level REAL NOT NULL CHECK(tone_level BETWEEN 0.8 AND 1.2),
  stance_level REAL NOT NULL CHECK(stance_level BETWEEN 0.8 AND 1.2),
  boundary_level REAL NOT NULL CHECK(boundary_level BETWEEN 0.8 AND 1.2),
  last_updated TEXT NOT NULL
);
