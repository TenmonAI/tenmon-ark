#!/usr/bin/env bash
# CHAT_TS_POSTLOCK_MAINTENANCE — seal 出力を束ね、baseline との退行検出（会話ロジックは変更しない）
set -euo pipefail
set +H
set +o histexpand

ROOT="/opt/tenmon-ark-repo"
API="$ROOT/api"
MAINT_PY="$API/automation/tenmon_chat_ts_postlock_maintenance_v1.py"
BASELINE="${CHAT_TS_POSTLOCK_BASELINE:-$API/automation/postlock_maintenance_baseline.json}"

# 入力: 第1引数 = seal ディレクトリ、未指定時は /var/log/tenmon/card の readlink
if [ -n "${1:-}" ]; then
  SEAL_DIR="$(readlink -f "$1")"
else
  SEAL_DIR="$(readlink -f /var/log/tenmon/card 2>/dev/null || true)"
fi

if [ -z "$SEAL_DIR" ] || [ ! -d "$SEAL_DIR" ]; then
  echo "[ERROR] seal dir not found. Pass path or run seal first (symlink /var/log/tenmon/card)." >&2
  exit 2
fi

OUT_DIR="${CHAT_TS_POSTLOCK_OUT:-$SEAL_DIR/_postlock_maintenance}"
mkdir -p "$OUT_DIR"

echo "[POSTLOCK_MAINTENANCE] seal_dir=$SEAL_DIR"
echo "[POSTLOCK_MAINTENANCE] baseline=$BASELINE"
echo "[POSTLOCK_MAINTENANCE] out=$OUT_DIR"

set +e
python3 "$MAINT_PY" \
  --seal-dir "$SEAL_DIR" \
  --baseline "$BASELINE" \
  --out-dir "$OUT_DIR" \
  --stdout-json | tee "$OUT_DIR/maintenance_stdout.json"
RC=$?
set -e

echo "[POSTLOCK_MAINTENANCE] exit=$RC"
exit "$RC"
