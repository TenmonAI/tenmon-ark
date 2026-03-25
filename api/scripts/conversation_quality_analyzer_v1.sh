#!/usr/bin/env bash
# TENMON_CONVERSATION_QUALITY_ANALYZER_AND_AUTO_CARD_GENERATOR_CURSOR_AUTO_V1
set -euo pipefail
set +H
set +o histexpand

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY_A="$ROOT/automation/conversation_quality_analyzer_v1.py"
echo "[CARD] TENMON_CONVERSATION_QUALITY_ANALYZER_AND_AUTO_CARD_GENERATOR_CURSOR_AUTO_V1"
echo "[API_ROOT] $ROOT"

python3 "$PY_A" "$@"
python3 "$ROOT/automation/conversation_quality_auto_card_generator_v1.py"

echo "[DONE] $ROOT/automation/conversation_quality_analyzer_summary.json"
echo "[DONE] $ROOT/automation/conversation_quality_generated_cards.json"
