#!/bin/bash
# ============================================================
# TENMON-MC Phase 3: 履歴SQLite DBの初期化
# ============================================================
set -u

HISTORY_DB="${1:-/var/www/tenmon-mc/history.db}"

sqlite3 "$HISTORY_DB" <<'SQL'
CREATE TABLE IF NOT EXISTS snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  section TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  metric_value TEXT NOT NULL,
  metric_type TEXT NOT NULL DEFAULT 'number'
);

CREATE INDEX IF NOT EXISTS idx_snapshots_time_section 
  ON snapshots(timestamp, section);
CREATE INDEX IF NOT EXISTS idx_snapshots_metric 
  ON snapshots(section, metric_key, timestamp);
SQL

chmod 644 "$HISTORY_DB"
chown www-data:www-data "$HISTORY_DB" 2>/dev/null || true

echo "history.db initialized: $HISTORY_DB"
