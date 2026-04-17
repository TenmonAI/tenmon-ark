#!/bin/bash
# ============================================================
# TENMON-MC Phase 3: 時系列JSON生成（7日、24時間）
# ============================================================
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

HISTORY_DB="/var/www/tenmon-mc/history.db"
OUTPUT_DIR="${DATA_DIR}/timeseries"
mkdir -p "$OUTPUT_DIR"

[ ! -f "$HISTORY_DB" ] && exit 0

# 7日間トレンド
sqlite3 "$HISTORY_DB" <<SQL > "${OUTPUT_DIR}/last_7days.json"
.mode json
SELECT 
  timestamp,
  section,
  metric_key,
  metric_value
FROM snapshots
WHERE timestamp > datetime('now', '-7 days')
ORDER BY timestamp ASC;
SQL

# 24時間詳細
sqlite3 "$HISTORY_DB" <<SQL > "${OUTPUT_DIR}/last_24hours.json"
.mode json
SELECT 
  timestamp,
  section,
  metric_key,
  metric_value
FROM snapshots
WHERE timestamp > datetime('now', '-24 hours')
ORDER BY timestamp ASC;
SQL

# 空ファイル対策（JSONが空の場合は空配列に）
for f in "${OUTPUT_DIR}/last_7days.json" "${OUTPUT_DIR}/last_24hours.json"; do
  if [ ! -s "$f" ]; then
    echo "[]" > "$f"
  fi
done

chmod 644 "${OUTPUT_DIR}"/*.json 2>/dev/null

exit 0
