#!/usr/bin/env bash
# TENMON_A1_KOKUZO_BAD_GUARD_VPS_V1 — ビルド + 監査 JSON + 任意で HTTP プローブ
set -euo pipefail
set +H
set +o histexpand

CARD="TENMON_A1_KOKUZO_BAD_GUARD_VPS_V1"
ROOT="${ROOT:-/opt/tenmon-ark-repo}"
API="$ROOT/api"
OUT_DIR="${CARD_OUT_DIR:-$API/automation/out/tenmon_a1_kokuzo_bad_guard_v1}"
PORT="${PORT:-8790}"
BASE="${TENMON_API_BASE:-http://127.0.0.1:$PORT}"

echo "[$CARD] api=$API out=$OUT_DIR"

cd "$API"
npm run build

node automation/tenmon_a1_kokuzo_bad_guard_audit_runner.mjs "$OUT_DIR"

if [[ "${SKIP_HTTP_PROBE:-}" != "1" ]]; then
  if curl -sf "$BASE/health" -o "$OUT_DIR/health_probe.json"; then
    export TENMON_BAD_GUARD_CURL_HEALTH="ok $BASE/health"
  else
    export TENMON_BAD_GUARD_CURL_HEALTH="skip_or_fail"
  fi
  if curl -sf "$BASE/api/audit" -o "$OUT_DIR/audit_probe.json"; then
    export TENMON_BAD_GUARD_CURL_AUDIT="ok $BASE/api/audit"
  else
    export TENMON_BAD_GUARD_CURL_AUDIT="skip_or_fail"
  fi
  node automation/tenmon_a1_kokuzo_bad_guard_audit_runner.mjs "$OUT_DIR"
fi

echo "[$CARD] done"
