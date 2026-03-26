#!/usr/bin/env bash
# TENMON_AUTONOMY_SYSTEMD_INSTALL_AND_PERSISTENT_BOOT — overnight daemon の unit 生成・（任意）install
set -euo pipefail

REPO="${TENMON_REPO_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
export TENMON_REPO_ROOT="$REPO"
API="${REPO}/api"
SVC_NAME="tenmon-continuous-self-improvement-overnight"
UNIT_DST="/etc/systemd/system/${SVC_NAME}.service"
ENV_DST="${TENMON_OVERNIGHT_SYSTEMD_ENV_FILE:-/etc/default/tenmon-overnight-daemon}"
OUT_SD="${API}/automation/out/systemd"

usage() {
  echo "usage: TENMON_REPO_ROOT=... $0 generate|dry-run|install" >&2
  echo "  generate  — Python で ${OUT_SD}/${SVC_NAME}.service + env.example を生成" >&2
  echo "  dry-run   — install に使うコマンドを表示のみ（実行しない）" >&2
  echo "  install   — sudo で unit + env を配置し daemon-reload + enable（要 root）" >&2
}

cmd_generate() {
  cd "$API"
  local extra=()
  if [[ -n "${TENMON_OVERNIGHT_SYSTEMD_ENV_FILE:-}" ]]; then
    extra+=(--systemd-environment-file "$TENMON_OVERNIGHT_SYSTEMD_ENV_FILE")
  fi
  python3 automation/tenmon_continuous_self_improvement_overnight_daemon_v1.py --emit-systemd-template-only "${extra[@]}"
}

cmd_dry_run() {
  cmd_generate
  echo "=== dry-run (not executed) ==="
  echo "sudo install -m 0644 \"${OUT_SD}/${SVC_NAME}.service\" \"${UNIT_DST}\""
  echo "sudo install -m 0640 \"${OUT_SD}/tenmon-overnight-daemon.env.example\" \"${ENV_DST}\""
  echo "sudo chmod 0640 \"${ENV_DST}\""
  echo "sudo systemctl daemon-reload"
  echo "sudo systemctl enable ${SVC_NAME}.service"
  echo "sudo systemctl start ${SVC_NAME}.service   # または reboot 後に自動起動"
  echo ""
  echo "=== stop / status / human stop ==="
  echo "sudo systemctl stop ${SVC_NAME}.service"
  echo "sudo systemctl status ${SVC_NAME}.service"
  echo "touch \"${REPO}/api/automation/tenmon_overnight_stop.signal\"   # 穏当停止（次サイクルで検出）"
}

cmd_install() {
  cmd_generate
  if ! command -v systemctl >/dev/null 2>&1; then
    echo "[FAIL] systemctl がありません" >&2
    exit 1
  fi
  sudo install -m 0644 "${OUT_SD}/${SVC_NAME}.service" "${UNIT_DST}"
  sudo install -m 0640 "${OUT_SD}/tenmon-overnight-daemon.env.example" "${ENV_DST}"
  sudo chmod 0640 "${ENV_DST}"
  sudo systemctl daemon-reload
  sudo systemctl enable "${SVC_NAME}.service"
  echo "[OK] enabled ${SVC_NAME}.service — start with: sudo systemctl start ${SVC_NAME}.service"
}

sub="${1:-}"
case "$sub" in
  generate) cmd_generate ;;
  dry-run) cmd_dry_run ;;
  install) cmd_install ;;
  -h|--help|help) usage; exit 0 ;;
  *) usage; exit 1 ;;
esac
