#!/usr/bin/env bash
# TENMON_REAL_PWA_CHAT_PATH_FORENSIC_VPS_V1
set -euo pipefail
set +H
set +o histexpand

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"

exec python3 "$API/automation/real_pwa_chat_path_forensic_v1.py" "$@"

