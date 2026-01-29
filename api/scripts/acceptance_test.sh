#!/usr/bin/env bash
set -euo pipefail
set +H

BASE="http://127.0.0.1:3000"
SERVICE_NAME="${SERVICE_NAME:-tenmon-ark-api}"

echo "[1] build"
pnpm -s build

echo "[2] restart"
sudo systemctl restart "${SERVICE_NAME}"

echo "[3] wait /api/audit"
for i in $(seq 1 10); do
  if curl -fsS "${BASE}/api/audit" >/dev/null 2>&1; then break; fi
  sleep 0.5
done

AUDIT="$(curl -fsS "${BASE}/api/audit")"
node -e 'const j=JSON.parse(process.argv[1]); if(j.ok!==true) process.exit(1);' "${AUDIT}"

echo "[4] /api/chat decisionFrame contract"
CHAT="$(curl -fsS -X POST "${BASE}/api/chat" -H "Content-Type: application/json" -d '{"message":"ping","mode":"thinking"}')"
node -e '
const j=JSON.parse(process.argv[1]);
if(!j.decisionFrame) process.exit(1);
if(j.decisionFrame.llm!==null) process.exit(1);
if(typeof j.decisionFrame.ku!=="object") process.exit(1);
' "${CHAT}"

echo "[PASS] acceptance_test.sh"

echo "[19] NATURAL mode (hello / date / help)"

post_chat_raw() {
  local message="$1"
  jq -nc --arg threadId "t_nat" --arg message "$message" '{threadId:$threadId, message:$message}' \
  | curl -fsS -X POST "${BASE}/api/chat" -H "Content-Type: application/json" -d @-
}

assert_natural() {
  local json="$1"
  node - "$json" <<'NODE'
const s = process.argv[2] || "";
if (!s.trim()) process.exit(1);
let j;
try { j = JSON.parse(s); } catch { process.exit(1); }
if (!j.decisionFrame) process.exit(1);
if (j.decisionFrame.mode !== "NATURAL") process.exit(1);
if (j.decisionFrame.llm !== null) process.exit(1);
if (!j.decisionFrame.ku || typeof j.decisionFrame.ku !== "object") process.exit(1);
NODE
}

r1="$(post_chat_raw "hello")"
assert_natural "$r1"

r2="$(post_chat_raw "date")"
assert_natural "$r2"
echo "$r2" | node -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8")); if(!String(r.response||"").includes("JST")) process.exit(1);'

r3="$(post_chat_raw "help")"
assert_natural "$r3"
echo "$r3" | node -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8")); const t=String(r.response||""); if(!(t.includes("1)")&&t.includes("2)")&&t.includes("3)"))) process.exit(1);'

echo "[PASS] Phase19 NATURAL"

echo "[19-0] NATURAL Japanese greeting gate"
r0="$(post_chat_raw "おはよう")"
assert_natural "$r0"
echo "$r0" | node -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8")); const t=String(r.response||""); if(!(t.includes("おはよう")||t.includes("天聞アーク"))) process.exit(1);'
echo "[PASS] Phase19-0"
