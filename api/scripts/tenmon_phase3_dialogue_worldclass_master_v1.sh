#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$REPO_ROOT"
export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-$REPO_ROOT}"
python3 api/automation/tenmon_phase3_dialogue_worldclass_master_v1.py "$@"

