#!/usr/bin/env bash
# TENMON_VPS_ACCEPTANCE_OS — build + 任意 systemd restart（OUT_DIR に build.log / build.rc）
set -u
set +e

OUT_DIR="${1:?usage: build_restart_wrapper_v1.sh OUT_DIR}"
ROOT="${ROOT:-/opt/tenmon-ark-repo}"
API="$ROOT/api"

mkdir -p "$OUT_DIR"
cd "$API" || exit 1

npm run build 2>&1 | tee "$OUT_DIR/build.log"
echo $? >"$OUT_DIR/build.rc"

if [ "${VPS_ACCEPTANCE_SKIP_RESTART:-0}" = "1" ]; then
  echo "[SKIP] VPS_ACCEPTANCE_SKIP_RESTART=1"
  exit 0
fi

if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl restart tenmon-ark-api.service 2>&1 | tee -a "$OUT_DIR/systemd_restart.log" || true
  sleep 2
else
  echo "[WARN] systemctl なし — restart スキップ" | tee -a "$OUT_DIR/systemd_restart.log"
fi

exit 0
