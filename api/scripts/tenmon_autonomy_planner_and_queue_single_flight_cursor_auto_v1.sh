#!/usr/bin/env bash
# TENMON_AUTONOMY_PLANNER_AND_QUEUE_SINGLE_FLIGHT_CURSOR_AUTO_V1 — syntax / dry-run / 本番検証（automation のみ）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY="$ROOT/automation/tenmon_autonomy_planner_and_queue_single_flight_cursor_auto_v1.py"
python3 -m py_compile "$PY"
python3 "$PY" --dry-run --verbose >/dev/null
python3 "$PY" --verbose
