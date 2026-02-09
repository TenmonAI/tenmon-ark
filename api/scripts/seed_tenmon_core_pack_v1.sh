#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
THREAD_ID="${THREAD_ID:-core-seed}"

YAML_PATH="/opt/tenmon-ark-repo/core_seeds/TENMON_CORE_PACK_v1.yaml"

echo "[CORE-SEED] TENMON_CORE_PACK_v1 seed start"
curl -fsS "$BASE_URL/api/audit" >/dev/null

if [ ! -f "$YAML_PATH" ]; then
  echo "[CORE-SEED] ERROR: YAML not found: $YAML_PATH" >&2
  exit 1
fi

YAML_TEXT="$(cat "$YAML_PATH")"
if [ -z "$YAML_TEXT" ]; then
  echo "[CORE-SEED] ERROR: YAML empty" >&2
  exit 1
fi

# 1) Laws: use existing /api/law/commit contract (doc/pdfPage/threadId)
#    Use doc=TENMON_CORE pdfPage=1 as the anchor
curl -fsS -X POST "$BASE_URL/api/law/commit" \
  -H 'Content-Type: application/json' \
  -d "{\"doc\":\"TENMON_CORE\",\"pdfPage\":1,\"threadId\":\"$THREAD_ID\"}" >/dev/null

# 2) Alg: /api/alg/commit requires steps[].text (confirmed)
curl -fsS -X POST "$BASE_URL/api/alg/commit" \
  -H 'Content-Type: application/json' \
  -d "{\"threadId\":\"$THREAD_ID\",\"title\":\"TENMON_CORE_PACK_v1\",\"steps\":[{\"text\":\"seed\"},{\"text\":\"law_commit\"},{\"text\":\"alg_commit\"}]}" >/dev/null

echo "[CORE-SEED] TENMON_CORE_PACK_v1 seed done"
