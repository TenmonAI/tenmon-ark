#!/usr/bin/env bash
set -euo pipefail
ROOT="${TENMON_REPO_ROOT:-/opt/tenmon-ark-repo}"
exec python3 "${ROOT}/api/automation/tenmon_mac_operator_decision_bind_v1.py" --repo-root "${ROOT}" "$@"
