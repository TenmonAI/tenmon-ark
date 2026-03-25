#!/usr/bin/env bash
# TENMON_FINAL_COMPLETION_PHASE3_LIVED_SEAL_AND_PROOF_CURSOR_AUTO_V1 — 単一実行順（ログは各スクリプト側）
set -euo pipefail
set +H
set +o histexpand

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
export TENMON_REPO_ROOT="$ROOT"

echo "[PHASE3] repo=$ROOT"

bash "$API/scripts/tenmon_pwa_lived_gate_recheck_and_fix_v1.sh" --stdout-json || true

if [ ! -f "$API/automation/pwa_final_seal_and_regression_guard_verdict.json" ]; then
  echo "[PHASE3] WARN: missing pwa_final_seal_and_regression_guard_verdict.json — run seal integrator if needed" >&2
fi

bash "$API/scripts/tenmon_pwa_final_seal_and_regression_guard_retry_v1.sh" --stdout-json || true

python3 "$API/automation/tenmon_remote_admin_cursor_runtime_proof_v1.py" || true
python3 "$API/automation/tenmon_worldclass_acceptance_scorecard_v1.py" || true
python3 "$API/automation/tenmon_phase3_completion_verdict_v1.py" --repo-root "$ROOT" || true

echo "[PHASE3] artifacts:"
ls -la "$API/automation/tenmon_phase3_completion_verdict.json" 2>/dev/null || true
ls -la "$API/automation/tenmon_worldclass_acceptance_scorecard.json" 2>/dev/null || true
ls -la "$API/automation/tenmon_remote_admin_cursor_runtime_proof_verdict.json" 2>/dev/null || true

exit 0
