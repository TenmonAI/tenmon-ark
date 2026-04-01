-- Training Chat: Learning Material Storage Schema

PRAGMA foreign_keys = ON;

-- Training sessions
CREATE TABLE IF NOT EXISTS training_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_created_at
  ON training_sessions(created_at);

-- Training messages (conversation logs)
CREATE TABLE IF NOT EXISTS training_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_training_messages_session_id
  ON training_messages(session_id);

CREATE INDEX IF NOT EXISTS idx_training_messages_created_at
  ON training_messages(created_at);

-- Training rules (extracted from conversations)
CREATE TABLE IF NOT EXISTS training_rules (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('vocabulary', 'policy', 'behavior', 'other')),
  title TEXT NOT NULL,
  rule_text TEXT NOT NULL,
  tags TEXT, -- JSON string
  evidence_message_ids TEXT NOT NULL, -- JSON array
  confidence INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_training_rules_session_id
  ON training_rules(session_id);

CREATE INDEX IF NOT EXISTS idx_training_rules_type
  ON training_rules(type);

-- Training freezes (future use: snapshot of rules)
CREATE TABLE IF NOT EXISTS training_freezes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rules_snapshot TEXT NOT NULL, -- JSON
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_training_freezes_created_at
  ON training_freezes(created_at);

-- Card5: asynchronous self-reflection ledger
CREATE TABLE IF NOT EXISTS kanagi_growth_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id TEXT NOT NULL,
  candidateType TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kanagi_growth_ledger_thread_created
  ON kanagi_growth_ledger(thread_id, created_at DESC);

-- Card9/10: latest routing/evolution snapshot ledger
CREATE TABLE IF NOT EXISTS evolution_ledger_v1 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id TEXT NOT NULL,
  routeReason TEXT,
  densityTarget TEXT,
  lawsUsedCount INTEGER DEFAULT 0,
  lawsUsedJson TEXT DEFAULT '[]',
  centerKey TEXT,
  source_priority TEXT,
  subgraph_nodes INTEGER DEFAULT 0,
  reflection_score REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_evolution_ledger_v1_thread_created
  ON evolution_ledger_v1(thread_id, created_at DESC);

