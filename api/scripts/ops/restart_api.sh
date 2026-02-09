#!/usr/bin/env bash
# TENMON-ARK API 再起動スクリプト（安全な再起動のみ許可）
# 目的: fuser -k などの危険な操作を禁止し、systemctl restart のみを使用

set -euo pipefail

echo "[restart] restarting tenmon-ark-api service"
sudo systemctl restart tenmon-ark-api.service

echo "[restart] waiting for service to be ready"
sleep 2

echo "[restart] verifying service status"
if ! sudo systemctl is-active --quiet tenmon-ark-api.service; then
  echo "[restart] ERROR: service is not active"
  sudo systemctl status tenmon-ark-api.service
  exit 1
fi

echo "[restart] verifying /api/audit"
if ! curl -fsS http://127.0.0.1:3000/api/audit > /dev/null; then
  echo "[restart] ERROR: /api/audit failed"
  exit 1
fi

echo "[restart] SUCCESS: service restarted and verified"
