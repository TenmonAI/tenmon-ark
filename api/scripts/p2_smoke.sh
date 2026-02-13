#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"

echo "[P2] audit"
curl -fsS "$BASE_URL/api/audit" >/dev/null

echo "[P2] seed/pack (real items, must not 500)"
RES="$(curl -fsS "$BASE_URL/api/seed/pack" \
  -H "Content-Type: application/json" \
  -d '{"seedIds":["KHS"],"options":{"limitPages":1}}')"

echo "$RES" | jq -e '.schemaVersion==1' >/dev/null
echo "$RES" | jq -e '.ok==true' >/dev/null
echo "$RES" | jq -e '.payload.kind=="SEED_PACK_V1"' >/dev/null
echo "$RES" | jq -e '(.payload.items|length)>=1' >/dev/null
echo "$RES" | jq -e '.payload.items[0].seedId=="KHS"' >/dev/null

echo "[P2] seed/unpack"
RES2="$(curl -fsS "$BASE_URL/api/seed/unpack" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"seedId":"KHS"}]}')"
echo "$RES2" | jq -e '.ok==true and .schemaVersion==1 and (.restored.seedsCount|type)=="number"' >/dev/null

echo "[P2] done"
