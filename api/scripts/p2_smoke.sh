#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"

echo "[P2] audit"
curl -fsS "$BASE_URL/api/audit" >/dev/null

echo "[P2] seed/pack"
curl -fsS "$BASE_URL/api/seed/pack" -H "Content-Type: application/json" \
  -d '{"seedIds":["s1","s2"],"options":{"level":1}}' \
| jq -e '.ok==true and .schemaVersion==1 and (.seedIds|length)==2 and (.payload.kind=="SEED_PACK_STUB")' >/dev/null

echo "[P2] seed/unpack"
curl -fsS "$BASE_URL/api/seed/unpack" -H "Content-Type: application/json" \
  -d '{"packId":"pack_test","payload":{"kind":"SEED_PACK_STUB","items":[]}}' \
| jq -e '.ok==true and .schemaVersion==1 and (.restored.seedsCount|type)=="number"' >/dev/null

echo "[P2] done"
