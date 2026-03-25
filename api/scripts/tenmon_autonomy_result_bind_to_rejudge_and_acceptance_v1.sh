#!/usr/bin/env bash
# TENMON_AUTONOMY_RESULT_BIND_TO_REJUDGE_AND_ACCEPTANCE_CURSOR_AUTO_V1
set -euo pipefail

ROOT="${TENMON_REPO_ROOT:-/opt/tenmon-ark-repo}"
export TENMON_REPO_ROOT="$ROOT"
cd "$(dirname "$0")/.."

exec python3 automation/tenmon_autonomy_result_bind_to_rejudge_and_acceptance_v1.py "$@"

