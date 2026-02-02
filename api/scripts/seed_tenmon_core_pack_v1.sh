#!/usr/bin/env bash
set -euo pipefail

# TENMON_CORE_PACK_v1 seed script
# - kokuzo_pages(doc='TENMON_CORE', pdfPage=1) に YAML全文を格納
# - /api/alg/commit, /api/law/commit に core-seed を投入

DATA_DIR="${TENMON_DATA_DIR:-/opt/tenmon-ark-data}"
REPO_DIR="$(cd "$(dirname "$(readlink -f "$0")")"/.. && pwd)"
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
YAML_PATH="$REPO_DIR/../core_seeds/TENMON_CORE_PACK_v1.yaml"
KOKUZO_DB="$DATA_DIR/kokuzo.sqlite"

echo "[CORE-SEED] TENMON_CORE_PACK_v1 seed start"

if [ ! -f "$YAML_PATH" ]; then
  echo "[FAIL] core_seeds/TENMON_CORE_PACK_v1.yaml not found at $YAML_PATH"
  exit 1
fi

if [ ! -f "$KOKUZO_DB" ]; then
  echo "[FAIL] kokuzo.sqlite not found at $KOKUZO_DB"
  exit 1
fi

YAML_TEXT="$(cat "$YAML_PATH")"
if [ -z "$YAML_TEXT" ]; then
  echo "[FAIL] TENMON_CORE_PACK_v1.yaml is empty"
  exit 1
fi

# SQLインジェクション対策: 単純なクォートエスケープ
YAML_ESCAPED="$(printf '%s\n' "$YAML_TEXT" | sed "s/'/''/g")"

echo "[CORE-SEED] Upsert TENMON_CORE into kokuzo_pages"

HAS_SHA="$(sqlite3 "$KOKUZO_DB" "PRAGMA table_info(kokuzo_pages);" 2>/dev/null | grep -c '^sha' || echo "0")"
if [ "$HAS_SHA" -gt 0 ]; then
  SHA_VAL="$(printf '%s' "$YAML_TEXT" | sha256sum | cut -d' ' -f1 | cut -c1-16)"
  sqlite3 "$KOKUZO_DB" <<EOF
INSERT OR REPLACE INTO kokuzo_pages (doc, pdfPage, text, sha, updatedAt)
VALUES ('TENMON_CORE', 1, '$YAML_ESCAPED', '$SHA_VAL', datetime('now'));
EOF
else
  sqlite3 "$KOKUZO_DB" <<EOF
INSERT OR REPLACE INTO kokuzo_pages (doc, pdfPage, text, updatedAt)
VALUES ('TENMON_CORE', 1, '$YAML_ESCAPED', datetime('now'));
EOF
fi

echo "[CORE-SEED] Rebuild FTS for TENMON_CORE"
sqlite3 "$KOKUZO_DB" <<'EOF'
DELETE FROM kokuzo_pages_fts WHERE doc='TENMON_CORE';
INSERT INTO kokuzo_pages_fts(rowid, doc, pdfPage, text)
  SELECT rowid, doc, pdfPage, text FROM kokuzo_pages WHERE doc='TENMON_CORE';
EOF

# 既存 core-seed をクリアしてから再投入（冪等）
echo "[CORE-SEED] Clear previous core-seed alg/law entries"
sqlite3 "$KOKUZO_DB" <<'EOF'
DELETE FROM kokuzo_algorithms WHERE threadId='core-seed';
DELETE FROM kokuzo_laws WHERE threadId='core-seed';
EOF

echo "[CORE-SEED] Commit Algorithm TENMON_CORE_PACK_v1 via /api/alg/commit"

ALG_BODY='{"threadId":"core-seed","title":"TENMON_CORE_PACK_v1","steps":[{"text":"TENMON core overview (seed)","doc":"KHS","pdfPage":32},{"text":"Breath -> Sound -> 50 -> Kana (seed)","doc":"KHS","pdfPage":549}],"summary":"Seed algorithm for TENMON_CORE_PACK_v1."}'
ALG_RESP="$(curl -fsS "$BASE_URL/api/alg/commit" -H "Content-Type: application/json" -d "$ALG_BODY" || echo "")"
echo "$ALG_RESP" | jq -e '.ok==true and (.id|type)=="number"' >/dev/null 2>&1 || {
  echo "[WARN] core-seed alg commit failed"
  echo "$ALG_RESP" | jq '.' 2>/dev/null || echo "$ALG_RESP"
}

echo "[CORE-SEED] Commit core laws via /api/law/commit"

commit_law() {
  local pdfPage="$1"
  local desc="$2"
  local body
  body="$(jq -n --arg doc "KHS" --arg tid "core-seed" --argjson page "$pdfPage" \
    '{doc:$doc,pdfPage:$page,threadId:$tid,desc:$ENV_DESC}' 2>/dev/null || true)"
}

# 主要モチーフを数件だけ投入（bodyテキストはKHSページ側のquoteに依存するのでdescはメタ情報としてtag的に扱う）
for spec in \
  "32:M_ROTATION" \
  "35:M_WATER_FIRE" \
  "119:M_YOGOU" \
  "402:M_AMATSU_KANAGI" \
  "549:M_CENTER"; do
  pdfPage="${spec%%:*}"
  motif="${spec##*:}"
  LAW_BODY="{\"doc\":\"KHS\",\"pdfPage\":$pdfPage,\"threadId\":\"core-seed\"}"
  RESP="$(curl -fsS "$BASE_URL/api/law/commit" -H "Content-Type: application/json" -d "$LAW_BODY" || echo "")"
  echo "$RESP" | jq -e '.ok==true and (.id|type)=="number"' >/dev/null 2>&1 || {
    echo "[WARN] core-seed law commit failed for KHS P${pdfPage} motif=${motif}"
    echo "$RESP" | jq '.' 2>/dev/null || echo "$RESP"
  }
done

echo "[CORE-SEED] TENMON_CORE_PACK_v1 seed done"

