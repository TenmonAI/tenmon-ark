#!/usr/bin/env bash
# TENMON_CONTINUITY_HOLD_DENSITY_AND_SINGLE_SOURCE_REJUDGE_CURSOR_AUTO_V1
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-$ROOT}"
exec python3 "$API/automation/tenmon_continuity_hold_density_and_single_source_rejudge_parent_v1.py" --repo-root "$ROOT" "$@"
