#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"

echo "[1] build"
pnpm -s build

echo "[2] restart"
sudo systemctl restart tenmon-ark-api.service

echo "[3] wait /api/audit"
for i in $(seq 1 80); do
  if curl -fsS "$BASE_URL/api/audit" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done
curl -fsS "$BASE_URL/api/audit" | jq -e 'type=="object"' >/dev/null

echo "[4] /api/chat decisionFrame contract"
resp=$(curl -fsS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
  -d '{"threadId":"t","message":"hello"}')
echo "$resp" | jq -e '.decisionFrame.llm==null and (.decisionFrame.ku|type)=="object" and (.response|type)=="string"' >/dev/null

post_chat_raw() {
  curl -fsS "$BASE_URL/api/chat" -H "Content-Type: application/json" \
    -d "{\"threadId\":\"t\",\"message\":\"$1\"}"
}

assert_natural() {
  local json="$1"
  echo "$json" | jq -e '.decisionFrame.mode=="NATURAL" and .decisionFrame.llm==null and (.decisionFrame.ku|type)=="object"' >/dev/null
}

echo "[19] NATURAL mode (hello / date / help)"
r1="$(post_chat_raw "hello")"
assert_natural "$r1"

r2="$(post_chat_raw "date")"
assert_natural "$r2"
echo "$r2" | jq -r '.response' | grep -E 'JST' >/dev/null

r3="$(post_chat_raw "help")"
assert_natural "$r3"
echo "$r3" | jq -r '.response' | grep -E '1\)|2\)|3\)' >/dev/null

echo "[PASS] Phase19 NATURAL"

echo "[19-0] NATURAL Japanese greeting gate"
r0="$(post_chat_raw "おはよう")"
assert_natural "$r0"
echo "$r0" | jq -r '.response' | grep -E 'おはよう|天聞アーク' >/dev/null
echo "[PASS] Phase19-0"

echo "[PASS] acceptance_test.sh"
