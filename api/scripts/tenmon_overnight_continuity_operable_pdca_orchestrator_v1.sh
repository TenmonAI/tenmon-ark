#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT="$(cd "${API}/.." && pwd)"
export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-$ROOT}"
cd "$API"

exec python3 "${API}/automation/tenmon_overnight_continuity_operable_pdca_orchestrator_v1.py" --repo-root "${TENMON_REPO_ROOT}" "$@"

