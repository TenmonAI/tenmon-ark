#!/usr/bin/env bash
set -euo pipefail

DATA_DIR="${TENMON_DATA_DIR:-/opt/tenmon-ark-data}"
KOKUZO_DB="$DATA_DIR/kokuzo.sqlite"
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"

echo "[CHECK] TENMON_CORE_PACK_v1 seed"

if [ ! -f "$KOKUZO_DB" ]; then
  echo "[FAIL] kokuzo.sqlite not found at $KOKUZO_DB"
  exit 1
fi

echo "[CHECK] kokuzo_pages TENMON_CORE P1"
LEN_CORE="$(sqlite3 "$KOKUZO_DB" "SELECT LENGTH(text) FROM kokuzo_pages WHERE doc='TENMON_CORE' AND pdfPage=1;" 2>/dev/null || echo "0")"
if [ "${LEN_CORE:-0}" -le 0 ]; then
  echo "[FAIL] TENMON_CORE P1 not found or empty (length=$LEN_CORE)"
  exit 1
fi
echo "[PASS] TENMON_CORE P1 exists (length=$LEN_CORE)"

echo "[CHECK] /api/alg/list?threadId=core-seed"
ALG_LIST="$(curl -fsS "$BASE_URL/api/alg/list?threadId=core-seed" || echo "")"
echo "$ALG_LIST" | jq -e '.ok==true and (.algorithms|type)=="array" and (.algorithms|length)>=1' >/dev/null 2>&1 || {
  echo "[FAIL] core-seed algorithms missing"
  echo "$ALG_LIST" | jq '.' 2>/dev/null || echo "$ALG_LIST"
  exit 1
}
echo "[PASS] core-seed algorithms exist"

echo "[CHECK] /api/law/list?threadId=core-seed"
LAW_LIST="$(curl -fsS "$BASE_URL/api/law/list?threadId=core-seed" || echo "")"
echo "$LAW_LIST" | jq -e '.ok==true and (.laws|type)=="array" and (.laws|length)>=1' >/dev/null 2>&1 || {
  echo "[FAIL] core-seed laws missing"
  echo "$LAW_LIST" | jq '.' 2>/dev/null || echo "$LAW_LIST"
  exit 1
}
echo "[PASS] core-seed laws exist"

echo "[PASS] TENMON_CORE_PACK_v1 seed check"

