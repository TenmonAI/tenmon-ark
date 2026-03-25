#!/usr/bin/env bash
# TENMON_COMPLETION_ASCENT_MASTER_CAMPAIGN_CURSOR_AUTO_V1
set -euo pipefail
set +H
set +o histexpand

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-$ROOT}"

exec python3 "$API/automation/tenmon_completion_ascent_master_campaign_v1.py" --repo-root "$ROOT" "$@"
