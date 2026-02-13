#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"

echo "[P2] audit"
curl -fsS "$BASE_URL/api/audit" >/dev/null

echo "[P2] seed/pack (real items)"
RES="$(curl -fsS "$BASE_URL/api/seed/pack" -H "Content-Type: application/json" \
  -d '{"seedIds":["KHS"],"options":{"limitPages":1}}')"

echo "$RES" | jq -e '.ok==true and .schemaVersion==1 and (.payload.kind=="SEED_PACK_V1") and (.payload.items|length)>=1' >/dev/null
echo "$RES" | jq -e '(.payload.items[0].seedId|type)=="string"' >/dev/null
echo "$RES" | jq -e '(.payload.items[0].evidenceIds|type)=="array"' >/dev/null

echo "[P2] seed/unpack"
RES2="$(curl -fsS "$BASE_URL/api/seed/unpack" -H "Content-Type: application/json" -d '{"packId":"dummy"}')"
echo "$RES2" | jq -e '.ok==true' >/dev/null

echo "[P2] done"
