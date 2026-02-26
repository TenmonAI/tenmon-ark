#!/usr/bin/env bash
set -euo pipefail
set +H

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
DB="${DB:-/opt/tenmon-ark-data/kokuzo.sqlite}"

THREAD="t"
N=3
EXPECT=3

while [ $# -gt 0 ]; do
  case "$1" in
    --thread) THREAD="$2"; shift 2;;
    --n) N="$2"; shift 2;;
    --expect) EXPECT="$2"; shift 2;;
    *) echo "[FATAL] unknown arg: $1" >&2; exit 4;;
  esac
done

count() { sqlite3 "$DB" "SELECT COUNT(*) FROM synapse_log;"; }

echo "[check_synapse_delta] BASE_URL=$BASE_URL DB=$DB THREAD=$THREAD N=$N EXPECT=$EXPECT"

B="$(count)"; echo "before_count=$B"
i=0
while [ "$i" -lt "$N" ]; do
  curl -fsS -X POST "$BASE_URL/api/chat" -H "Content-Type: application/json" \
    -d "{\"threadId\":\"$THREAD\",\"message\":\"#詳細 date\"}" >/dev/null || { echo "[FATAL] /api/chat failed" >&2; exit 4; }
  i=$((i+1))
done
A="$(count)"; echo "after_count=$A"

DELTA=$((A-B))
echo "delta=$DELTA"

sqlite3 "$DB" ".mode box" ".headers on" "SELECT createdAt, threadId, routeReason, synapseId FROM synapse_log ORDER BY createdAt DESC LIMIT 3;" || true

if [ "$DELTA" -lt "$EXPECT" ]; then
  echo "[FAIL] delta<$EXPECT" >&2
  exit 2
fi
echo "[PASS] delta>=$EXPECT"
exit 0
