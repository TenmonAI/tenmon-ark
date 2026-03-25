#!/usr/bin/env bash
# TENMON_CURSOR_SINGLE_FLIGHT_QUEUE_AND_REVIEW_GATE_CURSOR_AUTO_V1
set -euo pipefail

ROOT="${TENMON_REPO_ROOT:-/opt/tenmon-ark-repo}"
export TENMON_REPO_ROOT="$ROOT"
cd "$(dirname "$0")/.."

exec python3 automation/tenmon_cursor_single_flight_queue_v1.py "$@"
