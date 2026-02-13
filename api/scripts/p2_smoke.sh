#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"

echo "[P2] audit"
curl -fsS "$BASE_URL/api/audit" >/dev/null

echo "[P2] seed/pack (real items)"
# seedIds は暫定で "KHS" を投げる（kokuzo_pages doc='KHS' が存在することは Phase39 で担保済み）
RES="$(curl -fsS "$BASE_URL/api/seed/pack" -H "Content-Type: application/json" \
  -d '{"seedIds":["KHS"],"options":{"limitPages":1}}')"

echo "$RES" | jq -e '.ok==true and .schemaVersion==1 and (.payload.kind=="SEED_PACK_V1") and (.payload.items|length)>=1' >/dev/null
echo "$RES" | jq -e '.payload.items[0].seedId=="KHS"' >/dev/null
# doc は null でもよいが、KHSなら入るはず（入ってなければ後で照合を強化）
echo "$RES" | jq -e '(.payload.items[0].doc|type)=="string" or (.payload.items[0].doc==null)' >/dev/null
echo "$RES" | jq -e '(.payload.items[0].pdfPage|type)=="number" or (.payload.items[0].pdfPage==null)' >/dev/null

echo "[P2] seed/unpack"
curl -fsS "$BASE_URL/api/seed/unpack" -H "Content-Type: application/json" \
  -d '{"packId":"pack_test","payload":{"kind":"SEED_PACK_V1","items":[{"seedId":"KHS"}]}}' \
| jq -e '.ok==true and .schemaVersion==1 and (.restored.seedsCount|type)=="number"' >/dev/null

echo "[P2] done"
