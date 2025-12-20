-- TENMON-ARK Approval Token Schema (SQLite)

CREATE TABLE IF NOT EXISTS tool_approval (
  approval_id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  risk TEXT NOT NULL,
  summary TEXT NOT NULL,
  reason TEXT NOT NULL,
  session_id TEXT NOT NULL,
  persona TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tool_approval_token_hash
  ON tool_approval(token_hash);

CREATE INDEX IF NOT EXISTS idx_tool_approval_plan
  ON tool_approval(plan_id);
