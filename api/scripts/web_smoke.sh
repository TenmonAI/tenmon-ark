#!/usr/bin/env bash
set -euo pipefail
REPO="/opt/tenmon-ark-repo"

rm -rf "$REPO/api/web" 2>/dev/null || true

pnpm -C web build
bash api/scripts/deploy_web.sh

test -f /opt/tenmon-ark-live/web/index.html
echo "[PASS] web_smoke"
