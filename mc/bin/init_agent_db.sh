#!/bin/bash
# ============================================================
# TENMON-MC Phase 4: Agent DB 初期化
# ============================================================
set -u

AGENT_DB="${1:-/var/www/tenmon-mc/agents.db}"

sqlite3 "$AGENT_DB" <<'SQL'
CREATE TABLE IF NOT EXISTS agent_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  agent_name TEXT NOT NULL,
  agent_version TEXT,
  action_type TEXT NOT NULL,
  target_area TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  reference_url TEXT,
  priority TEXT DEFAULT 'medium',
  acknowledged_by_owner INTEGER DEFAULT 0,
  owner_response TEXT,
  owner_responded_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_time ON agent_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON agent_logs(agent_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_unack ON agent_logs(acknowledged_by_owner, timestamp DESC);

CREATE TABLE IF NOT EXISTS agent_tokens (
  token_hash TEXT PRIMARY KEY,
  agent_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS notion_synced (
  log_id INTEGER PRIMARY KEY,
  notion_page_id TEXT NOT NULL,
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);
SQL

chmod 644 "$AGENT_DB"
chown www-data:www-data "$AGENT_DB" 2>/dev/null || true

echo "agents.db initialized: $AGENT_DB"
