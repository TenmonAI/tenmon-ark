#!/usr/bin/env bash
# TENMON_CURSOR_MAC_EXECUTOR_VPS_V1 — dry-run で executor + 成果物を automation/out に揃える
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT/api"
OUT="$ROOT/api/automation/out"
SESSION="$OUT/cursor_executor_v1"
mkdir -p "$SESSION"

export CURSOR_EXECUTOR_DRY_RUN=1
MANIFEST="${TENMON_EXECUTOR_MANIFEST:-$OUT/normalized_remote_build_manifest.json}"
if [ ! -f "$MANIFEST" ]; then
  python3 automation/remote_build_job_normalizer_v1.py \
    --card-name "TENMON_EXECUTOR_FIXTURE_V1" \
    --card-body $'OBJECTIVE:\nexecutor fixture\n\nEDIT_SCOPE:\n- api/automation/**\n' \
    --out "$MANIFEST"
fi

python3 automation/cursor_mac_executor_v1.py \
  --manifest "$MANIFEST" \
  --repo-root "$ROOT" \
  --session-dir "$SESSION" \
  --dry-run

# VPS 成果物（固定名）
cp -f "$SESSION/cursor_job_session_manifest.json" "$OUT/cursor_job_session_manifest.json"
cp -f "$SESSION/mac_executor_state.json" "$OUT/mac_executor_state.json"
cp -f "$SESSION/dangerous_patch_block_report.json" "$OUT/dangerous_patch_block_report.json"

echo "TENMON_CURSOR_MAC_EXECUTOR_VPS_V1" >"$ROOT/api/automation/TENMON_CURSOR_MAC_EXECUTOR_VPS_V1"
date -u +"%Y-%m-%dT%H:%M:%SZ" >>"$ROOT/api/automation/TENMON_CURSOR_MAC_EXECUTOR_VPS_V1"

echo "[OK] TENMON_CURSOR_MAC_EXECUTOR_VPS_V1 → $OUT"
