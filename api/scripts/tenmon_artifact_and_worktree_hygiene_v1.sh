#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
exec python3 "$ROOT/api/automation/tenmon_artifact_and_worktree_hygiene_cursor_auto_v1.py" "$@"
