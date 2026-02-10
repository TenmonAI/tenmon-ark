#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/opt/tenmon-ark-repo}"
LIVE="${LIVE:-/var/www/tenmon-lp}"

echo "[deploy-site] install at repo root"
cd "$REPO_ROOT"
if ! pnpm install --frozen-lockfile 2>/dev/null; then
  echo "[deploy-site] pnpm install (frozen failed, using default)"
  pnpm install --frozen-lockfile=false
fi

echo "[deploy-site] build site (LP)"
pnpm -C site install
pnpm -C site build

echo "[deploy-site] sync dist to live"
sudo rsync -a --delete "$REPO_ROOT/site/dist/" "$LIVE/"

GIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
ISO8601="$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%SZ")"
LP_BUILD_MARK="LP_BUILD_MARK:${GIT_SHA} ${ISO8601}"
echo "$LP_BUILD_MARK" | sudo tee "$LIVE/build.txt" >/dev/null

echo "[deploy-site] reload nginx"
sudo systemctl reload nginx 2>/dev/null || true

echo "[deploy-site] SUCCESS"
