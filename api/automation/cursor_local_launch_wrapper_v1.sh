#!/usr/bin/env bash
# TENMON_CURSOR_MAC_EXECUTOR — Cursor 起動（Mac 実機）/ dry-run（VPS・CI）
# 環境変数:
#   TENMON_REPO_ROOT     リポジトリルート（必須）
#   TENMON_SESSION_ID
#   TENMON_SESSION_MANIFEST  cursor_job_session_manifest.json のパス
#   TENMON_CURSOR_LOG      ログ追記先
#   CURSOR_EXECUTOR_DRY_RUN=1  実起動しない（既定は dry-run 以外で起動試行）
set -euo pipefail
ROOT="${TENMON_REPO_ROOT:?TENMON_REPO_ROOT required}"
SID="${TENMON_SESSION_ID:-unknown}"
MAN="${TENMON_SESSION_MANIFEST:-}"
LOG="${TENMON_CURSOR_LOG:-/tmp/tenmon_cursor_launch.log}"
DRY="${CURSOR_EXECUTOR_DRY_RUN:-0}"

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

{
  echo "[$(ts)] TENMON_CURSOR_MAC_EXECUTOR wrapper"
  echo "session_id=$SID"
  echo "manifest=$MAN"
  echo "repo_root=$ROOT"
  echo "dry_run=$DRY"
} | tee -a "$LOG"

if [ ! -d "$ROOT" ]; then
  echo "[ERROR] repo root not a directory" | tee -a "$LOG"
  exit 2
fi

if [ "$DRY" = "1" ]; then
  echo "[$(ts)] DRY_RUN: would open Cursor workspace at $ROOT" | tee -a "$LOG"
  if [ -n "$MAN" ] && [ -f "$MAN" ]; then
    echo "--- session manifest head ---" | tee -a "$LOG"
    head -n 40 "$MAN" | tee -a "$LOG"
  fi
  echo "[$(ts)] DRY_RUN done (no cursor process)" | tee -a "$LOG"
  exit 0
fi

# --- 実起動（Mac 想定）---
if command -v cursor >/dev/null 2>&1; then
  echo "[$(ts)] launching: cursor $ROOT" | tee -a "$LOG"
  # 新しいウィンドウでワークスペースを開く（環境により無視される場合あり）
  cursor "$ROOT" >>"$LOG" 2>&1 || true
  exit 0
fi

if [ "$(uname -s)" = "Darwin" ] && command -v open >/dev/null 2>&1; then
  echo "[$(ts)] launching: open -a Cursor $ROOT" | tee -a "$LOG"
  open -a "Cursor" "$ROOT" >>"$LOG" 2>&1 || {
    echo "[WARN] open -a Cursor failed — install Cursor or add cursor CLI to PATH" | tee -a "$LOG"
    exit 3
  }
  exit 0
fi

echo "[ERROR] No cursor CLI and not macOS open; set CURSOR_EXECUTOR_DRY_RUN=1 for VPS" | tee -a "$LOG"
exit 3
