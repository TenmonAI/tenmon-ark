#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
DB="${DB:-/opt/tenmon-ark-data/kokuzo.sqlite}"
THREAD_ID="${THREAD_ID:-kata-seed}"

echo "[KATAKAMUNA-SEED] start BASE_URL=$BASE_URL DB=$DB"

# audit gate
curl -fsS "$BASE_URL/api/audit" >/dev/null

# doc preference: KATAKAMUNA if exists else KHS
DOC="KATAKAMUNA"
if ! sqlite3 "$DB" "select count(*) from kokuzo_pages where doc='KATAKAMUNA';" | grep -qE '^[1-9]'; then
  DOC="KHS"
fi

# laws: 6 commits (doc/pdfPage/threadId)  ※この形式は 200 OK を確認済み
for P in 1 2 3 4 5 6; do
  curl -fsS -X POST "$BASE_URL/api/law/commit" \
    -H 'Content-Type: application/json' \
    -d "{\"doc\":\"$DOC\",\"pdfPage\":$P,\"threadId\":\"$THREAD_ID\"}" >/dev/null
done

# algs: 3 commits (steps[].text required) ※この形式は 200 OK を確認済み
for i in 1 2 3; do
  curl -fsS -X POST "$BASE_URL/api/alg/commit" \
    -H 'Content-Type: application/json' \
    -d "{\"threadId\":\"$THREAD_ID\",\"title\":\"KATAKAMUNA_PRINCIPLES_V1-$i\",\"steps\":[{\"text\":\"scan\"},{\"text\":\"extract\"},{\"text\":\"commit\"}]}" >/dev/null
done

echo "[KATAKAMUNA-SEED] done doc=$DOC threadId=$THREAD_ID"
