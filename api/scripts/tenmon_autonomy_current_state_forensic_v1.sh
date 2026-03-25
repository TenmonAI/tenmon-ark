#!/usr/bin/env bash
# TENMON_AUTONOMY_CURRENT_STATE_FORENSIC_AND_SINGLE_SOURCE_TRUTH_CURSOR_AUTO_V1
# VPS 実データ + ローカル API ゲートのみ観測（product 非改変）。
set -euo pipefail

ROOT="${TENMON_REPO_ROOT:-/opt/tenmon-ark-repo}"
export TENMON_REPO_ROOT="$ROOT"
cd "$(dirname "$0")/.."

export TENMON_FORENSIC_API_BASE="${TENMON_FORENSIC_API_BASE:-http://127.0.0.1:3000}"

exec python3 automation/tenmon_autonomy_current_state_forensic_v1.py "$@"
