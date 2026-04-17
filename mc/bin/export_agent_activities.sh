#!/bin/bash
# ============================================================
# TENMON-MC Phase 4: Agent Activities JSON 生成
# agents.db の最新100件を JSON 化
# ============================================================
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

AGENT_DB="/var/www/tenmon-mc/agents.db"
OUTPUT="${DATA_DIR}/agent_activities.json"

if [ ! -f "$AGENT_DB" ]; then
  echo "[]" > "$OUTPUT"
  chmod 644 "$OUTPUT"
  exit 0
fi

# テーブル存在確認
TABLE_EXISTS=$(sqlite3 "$AGENT_DB" "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='agent_logs';")
if [ "$TABLE_EXISTS" != "1" ]; then
  echo "[]" > "$OUTPUT"
  chmod 644 "$OUTPUT"
  exit 0
fi

sqlite3 "$AGENT_DB" <<SQL > "$OUTPUT"
.mode json
SELECT
  id,
  timestamp,
  agent_name,
  agent_version,
  action_type,
  target_area,
  title,
  content,
  priority,
  reference_url,
  acknowledged_by_owner
FROM agent_logs
ORDER BY timestamp DESC
LIMIT 100;
SQL

# .mode json が空結果の場合は空配列を保証
if [ ! -s "$OUTPUT" ]; then
  echo "[]" > "$OUTPUT"
fi

chmod 644 "$OUTPUT"

exit 0
