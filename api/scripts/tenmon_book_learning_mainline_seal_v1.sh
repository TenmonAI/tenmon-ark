#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
exec python3 "$ROOT/api/automation/tenmon_book_learning_mainline_seal_cursor_auto_v1.py"
