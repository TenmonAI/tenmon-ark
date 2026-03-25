#!/usr/bin/env bash
# TENMON_WORLDCLASS_DIALOGUE_ACCEPTANCE_AND_PRIORITY_LOOP_CURSOR_AUTO_V1
# current-run 証跡で会話品質 → next cards → scorecard を束ねる（最小ラッパ）。
set -euo pipefail

ROOT="${TENMON_REPO_ROOT:-/opt/tenmon-ark-repo}"
export TENMON_REPO_ROOT="$ROOT"
cd "$(dirname "$0")/.."

export TENMON_LOOP_PROBE_BASE="${TENMON_LOOP_PROBE_BASE:-http://127.0.0.1:3000}"

exec python3 automation/tenmon_worldclass_dialogue_acceptance_priority_loop_v1.py "$@"
