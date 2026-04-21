#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_NAME="${SERVICE_NAME:-tenmon-ark-api}"

phase() {
  echo "[Phase $1] $2"
}

phase 1 "Build"
pnpm -C "${ROOT_DIR}" build

phase 2 "Restart systemd service"
systemctl restart "${SERVICE_NAME}"

for _ in {1..20}; do
  if curl -fsS "http://127.0.0.1:3000/api/audit" | jq -e '.ok==true' >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

if ! curl -fsS "http://127.0.0.1:3000/api/audit" | jq -e '.ok==true' >/dev/null 2>&1; then
  echo "[FAIL] API did not respond on 127.0.0.1:3000"
  exit 1
fi

phase 19 "NATURAL mode (hello / date / help)"

post_chat() {
  local message="$1"
  curl -sS -X POST "http://127.0.0.1:3000/api/chat" \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"${message}\"}"
}

validate_decision_frame() {
  local payload="$1"
  echo "${payload}" | node -e '
    const fs = require("fs");
    const res = JSON.parse(fs.readFileSync(0, "utf8"));
    if (!res.decisionFrame || res.decisionFrame.llm !== null) process.exit(1);
    if (!res.decisionFrame.ku || typeof res.decisionFrame.ku !== "object") process.exit(1);
  '
}

validate_greeting() {
  local payload="$1"
  echo "${payload}" | node -e '
    const fs = require("fs");
    const res = JSON.parse(fs.readFileSync(0, "utf8"));
    if (!res.response || !/hello/i.test(res.response)) process.exit(1);
  '
}

validate_datetime() {
  local payload="$1"
  echo "${payload}" | node -e '
    const fs = require("fs");
    const res = JSON.parse(fs.readFileSync(0, "utf8"));
    if (!res.response || !/JST/.test(res.response)) process.exit(1);
  '
}

validate_help() {
  local payload="$1"
  echo "${payload}" | node -e '
    const fs = require("fs");
    const res = JSON.parse(fs.readFileSync(0, "utf8"));
    if (!res.response || !res.response.includes("1)") || !res.response.includes("2)") || !res.response.includes("3)")) process.exit(1);
  '
}

greeting_payload="$(post_chat "hello")"
validate_greeting "${greeting_payload}"
validate_decision_frame "${greeting_payload}"

datetime_payload="$(post_chat "date")"
validate_datetime "${datetime_payload}"
validate_decision_frame "${datetime_payload}"

help_payload="$(post_chat "help")"
validate_help "${help_payload}"
validate_decision_frame "${help_payload}"

echo "[PASS] acceptance_test.sh"
