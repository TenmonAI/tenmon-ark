#!/usr/bin/env bash
set -euo pipefail
cd /opt/tenmon-ark-repo

pnpm -C web build
bash api/scripts/deploy_web.sh

test -f /opt/tenmon-ark-live/web/index.html
echo "[PASS] web_smoke"
