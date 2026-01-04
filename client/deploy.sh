#!/usr/bin/env bash
set -euo pipefail

VPS="root@162.43.90.247"
DEST="/var/www/tenmon-ark/dist"

npm run build
rsync -av --delete dist/ ${VPS}:${DEST}/
ssh ${VPS} 'nginx -t && systemctl reload nginx'
echo "✅ deployed: https://tenmon-ark.com/"
