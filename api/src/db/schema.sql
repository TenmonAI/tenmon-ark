-- TENMON-ARK Memory Persistence Schema (SQLite)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS session_memory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user','assistant')),
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_memory_session_time
  ON session_memory(session_id, timestamp);

CREATE TABLE IF NOT EXISTS conversation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  turn_index INTEGER NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(session_id, turn_index)
);

CREATE INDEX IF NOT EXISTS idx_conversation_log_session_turn
  ON conversation_log(session_id, turn_index);

CREATE TABLE IF NOT EXISTS kokuzo_core (
  key TEXT PRIMARY KEY,
  summary TEXT NOT NULL,
  importance REAL NOT NULL,
  updated_at TEXT NOT NULL
);
