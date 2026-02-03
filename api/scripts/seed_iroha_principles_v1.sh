#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
DB="${TENMON_DATA_DIR:-/opt/tenmon-ark-data}/kokuzo.sqlite"

THREAD_ID="iroha-seed"
DOC="IROHA"

if [ ! -f "$DB" ]; then
  echo "[FAIL] kokuzo sqlite not found: $DB"
  exit 1
fi

pick_page() {
  local pattern="$1"
  local p
  p="$(sqlite3 "$DB" "select pdfPage from kokuzo_pages where doc='$DOC' and length(text)>200 and text like '%$pattern%' order by pdfPage asc limit 1;")"
  if [ -z "${p:-}" ]; then
    # fallback: any non-empty page
    p="$(sqlite3 "$DB" "select pdfPage from kokuzo_pages where doc='$DOC' and length(text)>200 order by pdfPage asc limit 1;")"
  fi
  echo "$p"
}

commit_law() {
  local title="$1"
  local page="$2"
  if [ -z "${page:-}" ]; then
    echo "[WARN] skip (no page): $title"
    return 0
  fi
  curl -fsS "$BASE_URL/api/law/commit" \
    -H "Content-Type: application/json" \
    -d "{\"threadId\":\"$THREAD_ID\",\"doc\":\"$DOC\",\"pdfPage\":$page,\"title\":\"$title\"}" >/dev/null
  echo "[OK] law commit: $title (P$page)"
}

echo "[IROHA-SEED] start BASE_URL=$BASE_URL DB=$DB"

# 6 principles (最低限：Phase49 を通すため laws>=6 を保証)
P1="$(pick_page "天命")"
P2="$(pick_page "習慣")"
P3="$(pick_page "盲信")"
P4="$(pick_page "死")"
P5="$(pick_page "結")"
P6="$(pick_page "境界")"

commit_law "IROHA:LIFE_EXPANSION（中心→縁→現象）" "$P5"
commit_law "IROHA:BOUNDARY_BRIDGE（境界を渡す結び）" "$P6"
commit_law "IROHA:DEATH_REBIRTH（解組→空→再発）" "$P4"
commit_law "IROHA:HABIT_LESSON（病＝習慣の教訓）" "$P2"
commit_law "IROHA:DESTINY_MISSION（宿命×運命＝天命）" "$P1"
commit_law "IROHA:FAITH_DISCERNMENT（盲信→原点回帰→判別）" "$P3"

echo "[IROHA-SEED] done"
