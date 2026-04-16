#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:3000/api/chat}"

echo "=== SACRED ==="
curl -s -X POST "$BASE" -H "Content-Type: application/json" \
  -d '{"message":"言霊とは何か","sessionId":"acc1"}' | jq '.response | length'

echo "=== GENERAL ==="
curl -s -X POST "$BASE" -H "Content-Type: application/json" \
  -d '{"message":"最近疲れた","sessionId":"acc2"}' | jq '.response | length'

echo "=== SUKUYOU ==="
curl -s -X POST "$BASE" -H "Content-Type: application/json" \
  -d '{"message":"[SUKUYOU_SEED] honmeiShuku=翼宿 / disasterType=過剰責任型 / reversalAxis=外発→内集","sessionId":"acc3","threadId":"acc3"}' >/dev/null

curl -s -X POST "$BASE" -H "Content-Type: application/json" \
  -d '{"message":"今月の運気は？","sessionId":"acc3","threadId":"acc3"}' | jq '.response | length'
