#!/usr/bin/env bash
set -euo pipefail

TS="$(date -u +%Y%m%dT%H%M%SZ)"
BASE="http://127.0.0.1:3000"
DB="/opt/tenmon-ark-data/kokuzo.sqlite"
OUT="/var/log/tenmon/POST_RELEASE_SOAK_${TS}.md"

before="$(sqlite3 "$DB" 'select count(*) from kanagi_growth_ledger;')"
AUDIT="$(curl -fsS --max-time 20 "$BASE/api/audit")"

probe () {
  local msg="$1"
  local tid="$2"
  curl -fsS --max-time 20 "$BASE/api/chat" \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"$msg\",\"threadId\":\"$tid\"}"
}

{
  echo "# POST_RELEASE_SOAK"
  echo
  echo "- generated_at_utc: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "## audit"
  echo "$AUDIT" | jq
  echo
  echo "## probes"
  for pair in \
    "言霊とは何ですか？|soak_kotodama" \
    "魂とは何ですか？|soak_soul" \
    "言霊秘書とは何ですか？|soak_hisho" \
    "ウタヒとは？|soak_utahi" \
    "カタカムナとは何ですか？|soak_kata" \
    "少し落ち込んでいます…|soak_inward" \
    "この件をどう整理すればいい？|soak_organize"
  do
    msg="${pair%%|*}"
    tid="${pair##*|}"
    echo "### $msg"
    probe "$msg" "$tid" \
      | jq '{rr:.decisionFrame.ku.routeReason,topic:.decisionFrame.ku.meaningFrame.topicClass,scriptureKey:.decisionFrame.ku.scriptureKey,selfPhase:.decisionFrame.ku.kanagiSelf.selfPhase,intentPhase:.decisionFrame.ku.kanagiSelf.intentPhase,driftRisk:.decisionFrame.ku.kanagiSelf.driftRisk,shouldPersist:.decisionFrame.ku.kanagiSelf.shouldPersist,shouldRecombine:.decisionFrame.ku.kanagiSelf.shouldRecombine}'
    echo
  done

  after="$(sqlite3 "$DB" 'select count(*) from kanagi_growth_ledger;')"
  echo "## ledger"
  echo "- before: $before"
  echo "- after:  $after"
  echo "- delta:  $((after-before))"
  echo
  sqlite3 "$DB" "
  select id, route_reason, input_text, scripture_key, self_phase, intent_phase, created_at
  from kanagi_growth_ledger
  order by id desc
  limit 20;
  "
  echo
  echo "## auto_runner_health_only"
  systemctl status tenmon-auto-runner.service --no-pager -l | sed -n '1,80p' || true
  echo
  systemctl status tenmon-auto-runner.timer --no-pager -l | sed -n '1,80p' || true
  echo
  echo "## pwa_manual_check"
  echo "- https://tenmon-ark.com/pwa/?debug=1"
} > "$OUT"

echo "$OUT"
