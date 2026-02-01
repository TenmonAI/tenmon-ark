#!/usr/bin/env bash
set -euo pipefail
REPO="/opt/tenmon-ark-repo/api"
LIVE="/opt/tenmon-ark-live"

cd "$REPO"
pnpm -s build

sudo mkdir -p "$LIVE/dist"
sudo rsync -a --delete "$REPO/dist/" "$LIVE/dist/"

sudo systemctl restart tenmon-ark-api.service
