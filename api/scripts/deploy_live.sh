#!/usr/bin/env bash
set -euo pipefail

REPO="/opt/tenmon-ark-repo/api"
LIVE="/opt/tenmon-ark-live"

echo "[deploy] build in repo"
cd "$REPO"
pnpm -s build

echo "[deploy] sync dist repo -> live"
sudo mkdir -p "$LIVE/dist"
sudo rsync -a --delete "$REPO/dist/" "$LIVE/dist/"

echo "[deploy] restart service"
sudo systemctl restart tenmon-ark-api.service
