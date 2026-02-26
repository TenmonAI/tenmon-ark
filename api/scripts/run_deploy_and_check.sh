#!/usr/bin/env bash
set -euo pipefail
set +H

API_DIR="${API_DIR:-/opt/tenmon-ark-repo/api}"
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"

cd "$API_DIR"

# single restart responsibility: deploy_live.sh only
POST_CHECK="${POST_CHECK:-1}"
export POST_CHECK

bash ./scripts/deploy_live.sh
echo "[OK] deploy_live done (POST_CHECK=$POST_CHECK)"
