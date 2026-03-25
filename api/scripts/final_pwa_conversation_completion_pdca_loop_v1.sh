#!/usr/bin/env bash
# TENMON_FINAL_PWA_CONVERSATION_COMPLETION_PDCA_LOOP_VPS_V1
set -euo pipefail
set +H
set +o histexpand

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"

exec python3 "$API/automation/final_pwa_conversation_completion_pdca_loop_v1.py" "$@"

