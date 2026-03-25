#!/usr/bin/env bash
# Overnight autonomy loop. Pass-through args, e.g.:
#   TENMON_OVERNIGHT_RESUME_AFTER_FIRST_LIVE=1 ./tenmon_overnight_full_autonomy_completion_loop_v1.sh
#   ./tenmon_overnight_full_autonomy_completion_loop_v1.sh --resume-after-first-live
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$REPO_ROOT"
export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-$REPO_ROOT}"
python3 api/automation/tenmon_overnight_full_autonomy_completion_loop_v1.py "$@"

