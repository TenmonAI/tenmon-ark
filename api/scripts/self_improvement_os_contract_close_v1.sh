#!/usr/bin/env bash
# TENMON_SELF_IMPROVEMENT_OS_CANONICAL_CLOSE_VPS_V1 — canonical out へ必須4ファイルを閉じる
set -euo pipefail
set +H
set +o histexpand

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"

exec python3 "$API/automation/self_improvement_os_contract_close_v1.py" "$@"
