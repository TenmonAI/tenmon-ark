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

-- TENMON_ARK_PHASE3_TO_6: Persona / Thread / Promotion support tables
CREATE TABLE IF NOT EXISTS persona_profiles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS thread_persona_links (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  link_mode TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(thread_id, persona_id, link_mode)
);

CREATE INDEX IF NOT EXISTS idx_thread_persona_links_thread
  ON thread_persona_links(thread_id);

CREATE TABLE IF NOT EXISTS persona_knowledge_bindings (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL,
  knowledge_key TEXT NOT NULL,
  binding_strength REAL NOT NULL DEFAULT 1.0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS persona_memory_policies (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL,
  policy_key TEXT NOT NULL,
  policy_value TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS thread_center_memory (
  thread_id TEXT PRIMARY KEY,
  essential_goal TEXT,
  center_key TEXT,
  center_loss REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- TENMON_ARK_PHASE6: integrated acceptance baseline tables
CREATE TABLE IF NOT EXISTS memory_units (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS source_registry (
  id TEXT PRIMARY KEY,
  source_key TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL DEFAULT 'doc',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS source_analysis_logs (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memory_projection_logs (
  id TEXT PRIMARY KEY,
  memory_unit_id TEXT NOT NULL,
  projection_status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

INSERT OR IGNORE INTO persona_profiles (id, slug, display_name, created_at, updated_at)
VALUES
  ('persona-tenmon', 'tenmon-default', 'TENMON-ARK Default', datetime('now'), datetime('now')),
  ('persona-kukai', 'kukai-deepread', 'Kukai Deepread', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO persona_knowledge_bindings (id, persona_id, knowledge_key, binding_strength, created_at, updated_at)
VALUES
  ('pkb-seed-1', 'persona-kukai', 'foundational-kotodama', 1.0, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO persona_memory_policies (id, persona_id, policy_key, policy_value, created_at, updated_at)
VALUES
  ('pmp-seed-1', 'persona-kukai', 'memory_window', 'session+core', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO memory_units (id, content, created_at)
VALUES ('mu-seed-1', 'seed memory unit', datetime('now'));

INSERT OR IGNORE INTO source_registry (id, source_key, source_type, created_at)
VALUES ('sr-seed-1', 'seed-source', 'doc', datetime('now'));

INSERT OR IGNORE INTO source_analysis_logs (id, source_id, status, created_at)
VALUES ('sal-seed-1', 'sr-seed-1', 'ok', datetime('now'));

INSERT OR IGNORE INTO memory_projection_logs (id, memory_unit_id, projection_status, created_at)
VALUES ('mpl-seed-1', 'mu-seed-1', 'ok', datetime('now'));
