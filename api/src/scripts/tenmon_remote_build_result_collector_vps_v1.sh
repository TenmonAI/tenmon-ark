#!/usr/bin/env bash
# TENMON_REMOTE_BUILD_RESULT_COLLECTOR_VPS_V1 — Mac パッケージャ相当の束を生成して collector に流す
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT/api"
OUT="$ROOT/api/automation/out"
mkdir -p "$OUT"

JOB_ID="${TENMON_RESULT_JOB_ID:-rbj_vps_result_fixture_1}"
BUNDLE="$OUT/incoming_mac_bundle_v1.json"

bash automation/mac_result_packager_v1.sh "$ROOT" "$JOB_ID" \
  "${TENMON_CURSOR_SESSION_LOG:-}" >"$BUNDLE"

python3 automation/remote_build_result_collector_v1.py --ingest-file "$BUNDLE" | tee "$OUT/remote_build_result_collector_stdout.json"

cp -f "$OUT/remote_build_result_bundle.json" "$OUT/remote_build_result_bundle.json.bak" 2>/dev/null || true
echo "[OK] TENMON_REMOTE_BUILD_RESULT_COLLECTOR_VPS_V1 artifacts in $OUT"
