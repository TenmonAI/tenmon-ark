#!/usr/bin/env bash
set -euo pipefail
ROOT="${TENMON_REPO_ROOT:-/opt/tenmon-ark-repo}"
exec python3 "${ROOT}/api/automation/tenmon_mac_autonomy_24h_guard_v1.py" --repo-root "${ROOT}" "$@"
