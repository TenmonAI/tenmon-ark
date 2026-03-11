#!/usr/bin/env bash
set -euo pipefail

: "${CARD_NAME:?CARD_NAME is required}"
: "${REPO:?REPO is required}"
: "${API:?API is required}"
: "${BASE_URL:?BASE_URL is required}"
: "${LOGDIR:?LOGDIR is required}"

: "${CARD_PROMPT_FILE:=}"

APPLY_LOG="$LOGDIR/apply_${CARD_NAME}.log"

echo "[APPLY] card=$CARD_NAME" | tee -a "$APPLY_LOG"
echo "[APPLY] prompt=${CARD_PROMPT_FILE:-}" | tee -a "$APPLY_LOG"

if [[ -n "${CARD_PROMPT_FILE:-}" && ! -f "$CARD_PROMPT_FILE" ]]; then
  echo "[FAIL] prompt file missing: $CARD_PROMPT_FILE" | tee -a "$APPLY_LOG"
  exit 91
fi

if [[ -z "${TENMON_APPLY_ENGINE:-}" ]]; then
  echo "[SKIP] TENMON_APPLY_ENGINE is not set" | tee -a "$APPLY_LOG"
  exit 90
fi

echo "[ENGINE] $TENMON_APPLY_ENGINE" | tee -a "$APPLY_LOG"
bash -lc "$TENMON_APPLY_ENGINE" | tee -a "$APPLY_LOG"
