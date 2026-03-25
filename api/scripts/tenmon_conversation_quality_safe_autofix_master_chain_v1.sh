#!/usr/bin/env bash
# TENMON_CONVERSATION_QUALITY_AND_SAFE_AUTOFIX_MASTER_CHAIN_CURSOR_AUTO_V1
set -euo pipefail
set +H
set +o histexpand

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$ROOT/.." && pwd)"
export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-$REPO}"

echo "[CARD] TENMON_CONVERSATION_QUALITY_AND_SAFE_AUTOFIX_MASTER_CHAIN_CURSOR_AUTO_V1"
echo "[REPO] $TENMON_REPO_ROOT"

exec python3 "$ROOT/automation/tenmon_conversation_quality_safe_autofix_master_chain_v1.py" --repo-root "$TENMON_REPO_ROOT" "$@"
