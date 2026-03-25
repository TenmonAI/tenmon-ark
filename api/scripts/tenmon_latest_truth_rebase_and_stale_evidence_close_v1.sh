#!/usr/bin/env bash
# TENMON_LATEST_TRUTH_REBASE_AND_STALE_EVIDENCE_CLOSE_CURSOR_AUTO_V1
set -euo pipefail
set +H
set +o histexpand

CARD="TENMON_LATEST_TRUTH_REBASE_AND_STALE_EVIDENCE_CLOSE_CURSOR_AUTO_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_ROOT="${TENMON_LOG_ROOT:-/var/log/tenmon}"
LOG_DIR="${LOG_ROOT}/card_${CARD}/${TS}"
if ! mkdir -p "$LOG_DIR" 2>/dev/null; then
  LOG_ROOT="${TENMON_REPO_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}/api/automation/out/logs"
  LOG_DIR="${LOG_ROOT}/card_${CARD}/${TS}"
  mkdir -p "$LOG_DIR"
fi
exec > >(tee -a "$LOG_DIR/run.log") 2>&1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
BASE="${TENMON_GATE_BASE:-http://127.0.0.1:3000}"
export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-$ROOT}"

echo "[CARD] $CARD"
echo "[TS] $TS"
echo "[ROOT] $ROOT"
echo "[BASE] $BASE"

echo "== stale evidence invalidation =="
set +e
python3 "$API/automation/tenmon_stale_evidence_invalidation_v1.py" --repo-root "$ROOT" --stdout-json
RC_STALE=$?
set -e

echo "== latest rejudge refresh =="
set +e
python3 "$API/automation/tenmon_latest_state_rejudge_and_seal_refresh_v1.py" \
  --repo-root "$ROOT" \
  --base "$BASE" \
  --stdout-json
RC_REJUDGE=$?
set -e

echo "[OUT] $API/automation/tenmon_latest_truth_rebase_summary.json"
echo "[OUT] $API/automation/tenmon_latest_truth_rebase_report.md"
echo "[OUT] $API/automation/tenmon_latest_state_rejudge_and_seal_refresh_verdict.json"

python3 - <<'PY'
import json, pathlib
auto = pathlib.Path("/opt/tenmon-ark-repo/api/automation")
s = auto / "tenmon_latest_truth_rebase_summary.json"
v = auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json"
if s.exists():
    js = json.loads(s.read_text())
    print("latest_truth_rebased=", js.get("latest_truth_rebased"))
    print("truth_source_singleton=", js.get("truth_source_singleton"))
    print("stale_sources_count=", js.get("stale_sources_count"))
if v.exists():
    jv = json.loads(v.read_text())
    print("rejudge_generated_at=", jv.get("generated_at"))
    print("stale_inputs_count=", len(jv.get("stale_inputs") or []))
    print("recommended_next_card=", jv.get("recommended_next_card"))
PY

if [[ "$RC_STALE" -ne 0 || "$RC_REJUDGE" -ne 0 ]]; then
  exit 1
fi
exit 0
