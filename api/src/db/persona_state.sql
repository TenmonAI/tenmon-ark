-- TENMON-ARK Persona State Schema (SQLite)

CREATE TABLE IF NOT EXISTS persona_state (
  persona_id TEXT PRIMARY KEY,
  tone_level REAL NOT NULL CHECK(tone_level BETWEEN 0.8 AND 1.2),
  stance_level REAL NOT NULL CHECK(stance_level BETWEEN 0.8 AND 1.2),
  boundary_level REAL NOT NULL CHECK(boundary_level BETWEEN 0.8 AND 1.2),
  last_updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_naming (
  userId TEXT PRIMARY KEY,
  userName TEXT,
  assistantName TEXT,
  createdAt TEXT,
  updatedAt TEXT
);

-- N1_NAMING_FLOW_V1: 名付けフロー中間状態（STEP1→STEP2→保存で削除）
CREATE TABLE IF NOT EXISTS naming_flow (
  userId TEXT PRIMARY KEY,
  step TEXT NOT NULL,
  userName TEXT,
  assistantName TEXT,
  updatedAt TEXT NOT NULL
);
