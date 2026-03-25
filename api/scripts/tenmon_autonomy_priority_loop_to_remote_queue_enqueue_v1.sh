#!/usr/bin/env bash
# TENMON_AUTONOMY_PRIORITY_LOOP_TO_REMOTE_QUEUE_ENQUEUE_CURSOR_AUTO_V1
set -euo pipefail

ROOT="${TENMON_REPO_ROOT:-/opt/tenmon-ark-repo}"
export TENMON_REPO_ROOT="$ROOT"
cd "$(dirname "$0")/.."

exec python3 automation/tenmon_autonomy_priority_loop_to_remote_queue_enqueue_v1.py "$@"

