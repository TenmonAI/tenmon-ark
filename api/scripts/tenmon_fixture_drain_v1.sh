#!/usr/bin/env bash
# TENMON_FIXTURE_DRAIN_AND_READY_QUEUE_CANONICALIZE_CURSOR_AUTO_V1
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-$ROOT}"
exec python3 "$API/automation/tenmon_fixture_drain_v1.py" --repo-root "$ROOT" "$@"
