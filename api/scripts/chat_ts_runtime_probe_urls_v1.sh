#!/usr/bin/env bash
# CHAT_TS_100_COMPLETION — runtime URL 観測（GET のみ）
set -euo pipefail
BASE="${CHAT_TS_PROBE_BASE_URL:-http://127.0.0.1:3000}"
BASE="${BASE%/}"
for path in /health /api/audit /api/audit.build /api/chat; do
  code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 5 "${BASE}${path}" || echo "err")
  echo "${path} -> ${code}"
done
echo "Note: 正しい audit 一覧は GET ${BASE}/api/audit（/api/audit.build は未定義で 404 になり得る）"
