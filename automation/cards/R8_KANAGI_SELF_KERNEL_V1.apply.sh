#!/usr/bin/env bash
set -euo pipefail

: "${CARD_PROMPT_FILE:=/opt/tenmon-ark-repo/automation/prompts/R8_KANAGI_SELF_KERNEL_V1.prompt.md}"
: "${REPO:=/opt/tenmon-ark-repo}"
: "${API:=/opt/tenmon-ark-repo/api}"
: "${LOGDIR:=/tmp}"

APPLY_LOG="$LOGDIR/apply_R8_KANAGI_SELF_KERNEL_V1.log"

echo "[APPLY] card=R8_KANAGI_SELF_KERNEL_V1" | tee -a "$APPLY_LOG"
echo "[APPLY] prompt=$CARD_PROMPT_FILE" | tee -a "$APPLY_LOG"

if [[ ! -f "$CARD_PROMPT_FILE" ]]; then
  echo "[FAIL] prompt file missing: $CARD_PROMPT_FILE" | tee -a "$APPLY_LOG"
  exit 91
fi

if [[ -z "${TENMON_APPLY_ENGINE:-}" ]]; then
  echo "[FAIL] TENMON_APPLY_ENGINE is empty" | tee -a "$APPLY_LOG"
  echo "[HINT] Set TENMON_APPLY_ENGINE in /opt/tenmon-ark-repo/automation/systemd/tenmon-auto-runner.env" | tee -a "$APPLY_LOG"
  exit 90
fi

echo "[ENGINE] $TENMON_APPLY_ENGINE" | tee -a "$APPLY_LOG"

# NOTE:
# TENMON_APPLY_ENGINE must be a real VPS-side AI command that can use:
#   $CARD_PROMPT_FILE, $REPO, $API, $LOGDIR
bash -lc "$TENMON_APPLY_ENGINE" | tee -a "$APPLY_LOG"
