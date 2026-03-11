#!/usr/bin/env bash
# R10_INTENTION_SELF_LEDGER_SOAK_V1: read-only 観測補助。kanagi_growth_ledger の件数と直近 N 件を出力。
set -euo pipefail

DB="${DB:-/opt/tenmon-ark-data/kokuzo.sqlite}"
LIMIT="${LIMIT:-15}"
COUNT_ONLY=""

while [ $# -gt 0 ]; do
  case "$1" in
    --count-only) COUNT_ONLY=1; shift ;;
    --db) DB="$2"; shift 2 ;;
    --limit) LIMIT="$2"; shift 2 ;;
    *) echo "[soak_ledger_recent] unknown arg: $1" >&2; exit 2 ;;
  esac
done

if [ ! -f "$DB" ]; then
  echo "[soak_ledger_recent] DB not found: $DB" >&2
  exit 1
fi

count() {
  sqlite3 "$DB" "SELECT COUNT(*) FROM kanagi_growth_ledger;"
}

if [ -n "$COUNT_ONLY" ]; then
  count
  exit 0
fi

echo "count=$(count)"
echo "recent (limit=$LIMIT):"
sqlite3 "$DB" ".mode line" "
  SELECT id, created_at, substr(input_text,1,80) AS input_head, route_reason, self_phase, intent_phase
  FROM kanagi_growth_ledger
  ORDER BY id DESC
  LIMIT $LIMIT;
"
