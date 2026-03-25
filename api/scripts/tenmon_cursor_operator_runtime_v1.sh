#!/usr/bin/env bash
set -euo pipefail
ROOT="${TENMON_REPO_ROOT:-/opt/tenmon-ark-repo}"
exec python3 "${ROOT}/api/automation/tenmon_cursor_operator_runtime_v1.py" --repo-root "${ROOT}" "$@"
