#!/usr/bin/env bash
# TENMON_FINAL_ACCEPTANCE_PROBE_AND_AUTONOMY_RELOCK_CURSOR_AUTO_V3 (P5)
set -euo pipefail
ROOT="${ROOT:-/opt/tenmon-ark-repo}"
exec python3 "$ROOT/api/automation/tenmon_final_acceptance_probe_and_autonomy_relock_cursor_auto_v3.py"
