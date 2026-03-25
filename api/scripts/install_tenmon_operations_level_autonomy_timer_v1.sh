#!/usr/bin/env bash
# Install systemd timer: boot +10m, then every 3h; overlap は Python flock で抑止。
set -euo pipefail

REPO="${TENMON_REPO_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
SVC_NAME="tenmon-operations-level-autonomy"
UNIT_SRC="${REPO}/api/automation/out/systemd/${SVC_NAME}.service"
TIMER_SRC="${REPO}/api/automation/out/systemd/${SVC_NAME}.timer"
mkdir -p "$(dirname "$UNIT_SRC")"

SH="${REPO}/api/scripts/tenmon_operations_level_autonomy_v1.sh"
if [[ ! -x "$SH" ]]; then
  chmod +x "$SH" || true
fi

cat > "$UNIT_SRC" <<EOF
[Unit]
Description=TENMON operations-level autonomy one-shot ($SVC_NAME)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=${REPO}
Environment=TENMON_REPO_ROOT=${REPO}
Environment=TENMON_GATE_BASE=${TENMON_GATE_BASE:-http://127.0.0.1:3000}
ExecStart=${SH}
EOF

cat > "$TIMER_SRC" <<EOF
[Unit]
Description=TENMON operations-level autonomy timer (3h, boot +10m)

[Timer]
OnBootSec=10min
OnUnitActiveSec=3h
Unit=${SVC_NAME}.service
Persistent=true

[Install]
WantedBy=timers.target
EOF

echo "[GEN] $UNIT_SRC"
echo "[GEN] $TIMER_SRC"

if [[ "${SKIP_SYSTEMCTL_INSTALL:-}" == "1" ]]; then
  echo "[SKIP] SKIP_SYSTEMCTL_INSTALL=1 — unit ファイルのみ生成しました。"
  exit 0
fi

if ! command -v systemctl >/dev/null 2>&1; then
  echo "[WARN] systemctl なし — /etc/systemd/system へ手動コピーしてください。" >&2
  exit 0
fi

sudo install -m 0644 "$UNIT_SRC" "/etc/systemd/system/${SVC_NAME}.service"
sudo install -m 0644 "$TIMER_SRC" "/etc/systemd/system/${SVC_NAME}.timer"
sudo systemctl daemon-reload
sudo systemctl enable "${SVC_NAME}.timer"
sudo systemctl start "${SVC_NAME}.timer"
systemctl list-timers --all | grep "${SVC_NAME}" || true
echo "[OK] ${SVC_NAME}.timer enabled"
