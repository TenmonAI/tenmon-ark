#!/usr/bin/env bash
# TENMON_KOKUZO_LEARNING_OS_CONTRACT_CLOSE_VPS_V1
set -euo pipefail
set +H
set +o histexpand

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"

exec python3 "$API/automation/kokuzo_learning_os_contract_close_v1.py" "$@"

