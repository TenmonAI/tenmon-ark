#!/usr/bin/env bash
# TENMON_OVERNIGHT_FULL_PDCA_AUTONOMY_ORCHESTRATOR_CURSOR_AUTO_V1
set -euo pipefail
ROOT="${TENMON_REPO_ROOT:-/opt/tenmon-ark-repo}"
export TENMON_REPO_ROOT="$ROOT"
cd "${ROOT}/api"
exec python3 automation/overnight_full_pdca_autonomy_orchestrator_v1.py "$@"
