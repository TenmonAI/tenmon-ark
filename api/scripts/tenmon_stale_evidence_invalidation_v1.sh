#!/usr/bin/env bash
# TENMON_STALE_EVIDENCE_INVALIDATION_CURSOR_AUTO_V1
set -euo pipefail
set +H
set +o histexpand

CARD="TENMON_STALE_EVIDENCE_INVALIDATION_CURSOR_AUTO_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$LOG_DIR"
if [[ "${TENMON_STALE_INV_SYMLINK_CARD_LOG:-}" == "1" ]]; then
  ln -sfn "$LOG_DIR" "/var/log/tenmon/card_${CARD}_latest"
fi
exec > >(tee -a "$LOG_DIR/run.log") 2>&1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-$ROOT}"

echo "[CARD] $CARD"
echo "[TS] $TS"
echo "[ROOT] $ROOT"
echo "[API] $API"

set +e
python3 "$API/automation/tenmon_stale_evidence_invalidation_v1.py" --repo-root "$ROOT" "$@"
INV_RC=$?
set -e
echo "[VERDICT] $API/automation/tenmon_stale_evidence_invalidation_verdict.json"
echo "[REPORT] $API/automation/tenmon_stale_evidence_invalidation_report.md"
echo "[SUMMARY_V2] $API/automation/tenmon_stale_evidence_invalidation_summary_v2.json"
echo "[REPORT_V2] $API/automation/tenmon_stale_evidence_invalidation_report_v2.md"
echo "[REGISTRY] $API/automation/tenmon_truth_excluded_sources_registry_v1.json"
echo "[TRUTH_REBASE_SUMMARY] $API/automation/tenmon_latest_truth_rebase_summary.json"
echo "[TRUTH_REBASE_REPORT] $API/automation/tenmon_latest_truth_rebase_report.md"

export API
python3 <<'PY'
import json, os, pathlib
api = pathlib.Path(os.environ["API"])
p = api / "automation/tenmon_stale_evidence_invalidation_verdict.json"
if p.exists():
    j = json.loads(p.read_text())
    n = len(j.get("stale_sources") or j.get("stale_entries") or [])
    print("stale_superseded_count=", n)
    mg = len(j.get("missing_generated_at_closed") or [])
    print("missing_generated_at_closed_count=", mg)
    te = j.get("truth_excluded_sources") or []
    print("truth_excluded_sources_count=", len(te))
else:
    print("stale_superseded_count=unknown")
PY

if [[ "${TENMON_STALE_INV_SKIP_REJUDGE:-}" != "1" ]]; then
  set +e
  python3 "$API/automation/tenmon_latest_state_rejudge_and_seal_refresh_v1.py" --repo-root "$ROOT"
  RJ_RC=$?
  set -e
  echo "[REJUDGE_VERDICT] $API/automation/tenmon_latest_state_rejudge_and_seal_refresh_verdict.json"
  exit "$RJ_RC"
fi

exit "$INV_RC"
