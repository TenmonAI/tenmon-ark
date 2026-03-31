-- TENMON-ARK Persona State Schema (SQLite)

CREATE TABLE IF NOT EXISTS persona_state (
  persona_id TEXT PRIMARY KEY,
  tone_level REAL NOT NULL CHECK(tone_level BETWEEN 0.8 AND 1.2),
  stance_level REAL NOT NULL CHECK(stance_level BETWEEN 0.8 AND 1.2),
  boundary_level REAL NOT NULL CHECK(boundary_level BETWEEN 0.8 AND 1.2),
  last_updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS persona_profiles (
  id TEXT PRIMARY KEY,
  profile_name TEXT NOT NULL,
  assistant_call_name TEXT,
  user_call_name TEXT,
  forbidden_moves TEXT,
  is_active INTEGER DEFAULT 0,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS user_memory_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  memory_type TEXT,
  memory_key TEXT,
  memory_value TEXT,
  is_pinned INTEGER DEFAULT 0,
  created_at TEXT
);
