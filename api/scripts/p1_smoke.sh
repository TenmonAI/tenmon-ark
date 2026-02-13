#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"

echo "[P1] audit"
curl -fsS "$BASE_URL/api/audit" | jq -e '.ok==true and .readiness.stage=="READY"' >/dev/null

echo "[P1] (placeholder) export/import contract"
# ここは client 実装後に実際の export/import を叩く。
# いまは “存在しないなら FAIL” でOK。次カードで実装して PASS にする。
curl -fsS "$BASE_URL/api/pwa/export" >/dev/null
curl -fsS -X POST "$BASE_URL/api/pwa/import" -H 'Content-Type: application/json' -d '{}' >/dev/null

echo "[P1] done"
