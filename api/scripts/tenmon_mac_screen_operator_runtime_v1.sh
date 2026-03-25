#!/usr/bin/env bash
# Mac 実機専用。Linux/VPS では Python 側が fail-fast する。
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT="$(cd "${API}/.." && pwd)"
export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-$ROOT}"
export PYTHONPATH="${PYTHONPATH:-}${PYTHONPATH:+:}${API}/automation"
python3 "${API}/automation/tenmon_mac_screen_operator_runtime_v1.py" "$@"
