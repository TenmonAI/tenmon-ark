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

CREATE TABLE IF NOT EXISTS tenmon_training_log (
  id TEXT PRIMARY KEY,
  createdAt TEXT,
  question TEXT
);

CREATE TABLE IF NOT EXISTS tenmon_audit_log (
  id TEXT PRIMARY KEY,
  createdAt TEXT,
  question TEXT
);

CREATE TABLE IF NOT EXISTS scripture_learning_ledger (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  threadId TEXT NOT NULL,
  message TEXT NOT NULL,
  routeReason TEXT NOT NULL,
  scriptureKey TEXT,
  subconceptKey TEXT,
  conceptKey TEXT,
  thoughtGuideKey TEXT,
  personaConstitutionKey TEXT,
  hasEvidence INTEGER NOT NULL DEFAULT 0,
  hasLawTrace INTEGER NOT NULL DEFAULT 0,
  resolvedLevel TEXT NOT NULL,
  unresolvedNote TEXT
);

CREATE INDEX IF NOT EXISTS idx_scripture_learning_ledger_thread
  ON scripture_learning_ledger(threadId, createdAt);

-- EVOLUTION_LEDGER_V1: causal append-only evolution log (finalize / bridge から 1 リクエスト 1 行)
CREATE TABLE IF NOT EXISTS evolution_ledger_v1 (
  eventId TEXT PRIMARY KEY,
  sourceCard TEXT NOT NULL,
  changedLayer TEXT NOT NULL,
  beforeSummary TEXT NOT NULL DEFAULT '{}',
  afterSummary TEXT NOT NULL DEFAULT '{}',
  affectedRoute TEXT NOT NULL DEFAULT '',
  affectedSourcePack TEXT NOT NULL DEFAULT '',
  affectedDensity TEXT NOT NULL DEFAULT '',
  affectedProse TEXT NOT NULL DEFAULT '',
  regressionRisk TEXT NOT NULL DEFAULT 'unknown',
  acceptedBy TEXT NOT NULL DEFAULT 'runtime_v1',
  status TEXT NOT NULL DEFAULT 'accepted',
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_evolution_ledger_v1_created ON evolution_ledger_v1(createdAt);
CREATE INDEX IF NOT EXISTS idx_evolution_ledger_v1_source ON evolution_ledger_v1(sourceCard);
CREATE INDEX IF NOT EXISTS idx_evolution_ledger_v1_status ON evolution_ledger_v1(status);

