#!/usr/bin/env bash
# TENMON_ARK_BOOK_CANON_LEDGER_AND_CONVERSATION_REUSE_CURSOR_AUTO_V1
set -euo pipefail
ROOT="${ROOT:-/opt/tenmon-ark-repo}"
exec python3 "$ROOT/api/automation/tenmon_ark_book_canon_ledger_and_conversation_reuse_cursor_auto_v1.py"
