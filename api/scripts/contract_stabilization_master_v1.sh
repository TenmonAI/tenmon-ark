#!/usr/bin/env bash
# TENMON_CONTRACT_STABILIZATION_MASTER_VPS_V1
set -euo pipefail
set +H
set +o histexpand

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"

exec python3 "$API/automation/contract_stabilization_master_v1.py" "$@"

