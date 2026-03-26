#!/usr/bin/env bash
set -euo pipefail

ROOT="${TENMON_REPO_ROOT:-/opt/tenmon-ark-repo}"
export TENMON_REPO_ROOT="$ROOT"

cd "$ROOT/api"

# rearm 準備のみ。常駐起動はしない。
if [ -z "${TENMON_DAYBREAK_OVERNIGHT_SUMMARY:-}" ]; then
  if [ -f "automation/tenmon_continuous_self_improvement_overnight_daemon_summary.json" ]; then
    export TENMON_DAYBREAK_OVERNIGHT_SUMMARY="$ROOT/api/automation/tenmon_continuous_self_improvement_overnight_daemon_summary.json"
  else
    export TENMON_DAYBREAK_OVERNIGHT_SUMMARY="$ROOT/api/automation/overnight_full_pdca_summary.json"
  fi
fi
python3 automation/daybreak_report_and_next_queue_rearm_v1.py || true
