#!/usr/bin/env bash
# TENMON_OCR_TO_BOOK_SETTLEMENT_BIND_CURSOR_AUTO_V1
set -euo pipefail
ROOT="${ROOT:-/opt/tenmon-ark-repo}"
exec python3 "$ROOT/api/automation/tenmon_ocr_to_book_settlement_bind_cursor_auto_v1.py"
