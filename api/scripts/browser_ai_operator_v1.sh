#!/usr/bin/env bash
# TENMON_BROWSER_AI_OPERATOR_MAC_RUNTIME_CURSOR_AUTO_V1 — thin wrapper
set -euo pipefail
ROOT="${TENMON_REPO_ROOT:-/opt/tenmon-ark-repo}"
exec python3 "${ROOT}/api/automation/browser_ai_operator_v1.py" "$@"
