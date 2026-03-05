-- TENMON-ARK Tool Audit Schema (SQLite)

CREATE TABLE IF NOT EXISTS tool_audit (
  audit_id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  persona TEXT NOT NULL,
  risk TEXT NOT NULL,
  actions_json TEXT NOT NULL,
  ok INTEGER NOT NULL,
  result_json TEXT NOT NULL,
  denied_reason TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tool_audit_plan
  ON tool_audit(plan_id);

CREATE INDEX IF NOT EXISTS idx_tool_audit_created
  ON tool_audit(created_at);

CREATE TABLE IF NOT EXISTS concept_weights (
  concept TEXT PRIMARY KEY,
  weight REAL DEFAULT 0,
  updatedAt INTEGER
);

CREATE TABLE IF NOT EXISTS trainer_runs (
  runId TEXT PRIMARY KEY,
  threadId TEXT,
  reward REAL,
  createdAt INTEGER
);
