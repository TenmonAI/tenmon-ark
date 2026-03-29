#!/usr/bin/env bash
# TENMON_OCR_RUNTIME_WAKE_AND_BINARY_VERIFY_CURSOR_AUTO_V1
set -euo pipefail
ROOT="${ROOT:-/opt/tenmon-ark-repo}"
exec python3 "$ROOT/api/automation/tenmon_ocr_runtime_wake_and_binary_verify_cursor_auto_v1.py"
