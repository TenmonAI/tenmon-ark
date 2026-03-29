#!/usr/bin/env bash
# TENMON_KOKUZO_CORE_TENMON_READING_INSERT_CURSOR_AUTO_V1 — kokuzo_core 天聞読解4key投入
set -euo pipefail

ROOT="${ROOT:-/opt/tenmon-ark-repo}"
exec python3 "$ROOT/api/automation/tenmon_kokuzo_core_tenmon_reading_insert_v1.py" "$@"
