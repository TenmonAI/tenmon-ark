#!/usr/bin/env bash
# TENMON_MAC_REMOTE_BRIDGE_VPS_V1 — ローカル受信スタブ + bridge 送受信（Mac なしでも検証可能）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT/api"
OUT="$ROOT/api/automation/out"
mkdir -p "$OUT"
MANIFEST="$OUT/normalized_remote_build_manifest.json"
if [ ! -f "$MANIFEST" ]; then
  python3 automation/remote_build_job_normalizer_v1.py \
    --card-name "TENMON_BRIDGE_FIXTURE_V1" \
    --card-body $'OBJECTIVE:\nbridge fixture\n\nEDIT_SCOPE:\n- api/automation/**\n' \
    --out "$MANIFEST" || true
fi

TMP_INBOX="$(mktemp -d)"
trap 'rm -rf "$TMP_INBOX"' EXIT

export TENMON_MAC_BRIDGE_SECRET="${TENMON_MAC_BRIDGE_SECRET:-tenmon_bridge_test_secret}"
export TENMON_MAC_RECEIVER_PORT="${TENMON_MAC_RECEIVER_PORT:-18888}"
export TENMON_MAC_DROP_DIR="$TMP_INBOX"
export TENMON_MAC_RECEIVER_BIND=127.0.0.1

bash "$ROOT/api/automation/mac_remote_receiver_stub_v1.sh" &
PID=$!
sleep 1

export TENMON_MAC_BRIDGE_URL="http://127.0.0.1:${TENMON_MAC_RECEIVER_PORT}/tenmon/mac-bridge/v1/ingest"

set +e
python3 automation/mac_remote_bridge_v1.py \
  --manifest "$MANIFEST" \
  --secret "$TENMON_MAC_BRIDGE_SECRET" \
  --max-retries 3 \
  --send-result-out "$OUT/remote_bridge_send_result.json" \
  --ack-out "$OUT/remote_bridge_ack.json"
RC=$?
set -e

kill "$PID" 2>/dev/null || true
wait "$PID" 2>/dev/null || true

if [ -f "$TMP_INBOX/mac_receiver_drop_manifest.json" ]; then
  cp -f "$TMP_INBOX/mac_receiver_drop_manifest.json" "$OUT/mac_receiver_drop_manifest.json"
else
  echo '{"ok":false,"note":"no drop manifest"}' >"$OUT/mac_receiver_drop_manifest.json"
fi

echo "TENMON_MAC_REMOTE_BRIDGE_VPS_V1" >"$ROOT/api/automation/TENMON_MAC_REMOTE_BRIDGE_VPS_V1"
date -u +"%Y-%m-%dT%H:%M:%SZ" >>"$ROOT/api/automation/TENMON_MAC_REMOTE_BRIDGE_VPS_V1"

echo "[TENMON_MAC_REMOTE_BRIDGE_VPS_V1] rc=$RC out=$OUT"
exit "$RC"
