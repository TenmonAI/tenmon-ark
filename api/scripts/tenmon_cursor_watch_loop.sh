#!/usr/bin/env bash
# TENMON_MAC_WATCH_LOOP_REFRESH_AUTH_AND_NONFIXTURE_RUNTIME_CURSOR_AUTO_V1
# Mac 常駐: refresh で Bearer を都度取得 → /queue → /next（non-fixture 優先は API 側）→
# 非 fixture のみ dry-run 証跡と result POST。fixture は release のみ（完了にしない）。
set -euo pipefail

MAC_HOME="${TENMON_MAC_HOME:-$HOME/tenmon-mac}"
LOG_DIR="${TENMON_MAC_LOG_DIR:-$MAC_HOME/logs}"
mkdir -p "$LOG_DIR"
MAIN_LOG="${TENMON_MAC_WATCH_LOG:-$LOG_DIR/watch_loop.log}"

BASE="${TENMON_REMOTE_CURSOR_BASE_URL:?set TENMON_REMOTE_CURSOR_BASE_URL}"
POLL_SEC="${TENMON_WATCH_POLL_SEC:-60}"
SKEW_SEC="${TENMON_WATCH_AUTH_SKEW_SEC:-300}"

PYTHON="${TENMON_MAC_PYTHON:-$MAC_HOME/.venv/bin/python}"
if [[ ! -x "$PYTHON" ]] && command -v python3 >/dev/null 2>&1; then
  PYTHON="$(command -v python3)"
fi

AUTH_REFRESH="${TENMON_MAC_AUTH_REFRESH_SCRIPT:-$MAC_HOME/tenmon_mac_executor_auth_refresh_v1.py}"
EXECUTOR_PY="${TENMON_MAC_EXECUTOR_PY:-$MAC_HOME/tenmon_cursor_executor.py}"
# 任意: bash -c 用（例: python3 ~/tenmon-mac/foo.py）。環境変数 TENMON_WATCH_ITEM_JSON に item JSON パスを渡す。
EXECUTOR_CMD="${TENMON_MAC_EXECUTOR_CMD:-}"
REVIEW_ACCEPT_ENABLE="${TENMON_REVIEW_ACCEPT_ENABLE:-1}"
REVIEW_ACCEPT_TIMEOUT_SEC="${TENMON_REVIEW_ACCEPT_TIMEOUT_SEC:-25}"
REVIEW_ACCEPTOR="${TENMON_MAC_REVIEW_ACCEPTOR_SCRIPT:-$MAC_HOME/cursor_review_acceptor_v1.py}"

log() {
  local line="[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"
  echo "$line" | tee -a "$MAIN_LOG" >&2
}

require_jq() {
  command -v jq >/dev/null 2>&1 || {
    log "error: jq required (brew install jq)"
    exit 1
  }
}

refresh_token() {
  if [[ ! -f "$AUTH_REFRESH" ]]; then
    log "error: missing auth refresh script: $AUTH_REFRESH"
    return 1
  fi
  "$PYTHON" "$AUTH_REFRESH" --skew-sec "$SKEW_SEC" --print-token 2>>"$MAIN_LOG"
}

tick() {
  local ts qid fixture body_file http_out item_json
  ts="$(date -u +%Y%m%dT%H%M%SZ)"

  local TOKEN
  TOKEN="$(refresh_token)" || {
    log "auth_refresh_failed"
    return 0
  }
  if [[ -z "${TOKEN// }" ]]; then
    log "empty_token"
    return 0
  fi

  local queue_json
  if ! queue_json="$(curl -fsS -H "Authorization: Bearer $TOKEN" "$BASE/api/admin/cursor/queue")"; then
    log "queue_request_failed"
    return 0
  fi
  echo "$queue_json" >"$LOG_DIR/queue_${ts}.json"

  local next_json
  if ! next_json="$(curl -fsS -H "Authorization: Bearer $TOKEN" "$BASE/api/admin/cursor/next")"; then
    log "next_request_failed"
    return 0
  fi
  echo "$next_json" >"$LOG_DIR/next_${ts}.json"

  local ok_item
  ok_item="$(echo "$next_json" | jq -r 'if (.ok == true) and (.item != null) then "yes" else "no" end')"
  if [[ "$ok_item" != "yes" ]]; then
    log "no_item lease_reconciled=$(echo "$next_json" | jq -r '.lease_reconciled // 0')"
    return 0
  fi

  qid="$(echo "$next_json" | jq -r '.item.id // .item.queue_id // empty')"
  jid="$(echo "$next_json" | jq -r '.item.job_id // .item.id // empty')"
  [[ -z "$jid" ]] && jid="$qid"
  fixture="$(echo "$next_json" | jq -r '.item.fixture // false')"
  if [[ -z "$qid" ]]; then
    log "item_missing_id"
    return 0
  fi

  if [[ "$fixture" == "true" ]]; then
    log "fixture_delivered releasing id=$qid (no result completion)"
    curl -fsS -X POST "$BASE/api/admin/cursor/release" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$(jq -n --arg id "$qid" '{id:$id}')" >"$LOG_DIR/release_fixture_${ts}.json" || log "release_failed id=$qid"
    return 0
  fi

  export CURSOR_EXECUTOR_DRY_RUN=1
  item_json="$LOG_DIR/item_${ts}.json"
  echo "$next_json" | jq -c '.item' >"$item_json"
  if [[ -n "$EXECUTOR_CMD" ]]; then
    log "executor_cmd_dry_run id=$qid"
    export TENMON_WATCH_ITEM_JSON="$item_json"
    bash -c "$EXECUTOR_CMD" >>"$LOG_DIR/executor_${ts}.log" 2>&1 || log "executor_cmd_nonzero id=$qid"
  elif [[ -f "$EXECUTOR_PY" ]]; then
    log "executor_dry_run id=$qid py=$EXECUTOR_PY"
    "$PYTHON" "$EXECUTOR_PY" "$item_json" >>"$LOG_DIR/executor_${ts}.log" 2>&1 || log "executor_nonzero_exit id=$qid"
  else
    log "no_executor stub_logs_only id=$qid (set TENMON_MAC_EXECUTOR_PY or TENMON_MAC_EXECUTOR_CMD)"
  fi

  local review_json review_status manual_review_required
  review_json="$LOG_DIR/review_accept_${ts}.json"
  review_status="skipped"
  manual_review_required="false"
  if [[ "$REVIEW_ACCEPT_ENABLE" == "1" ]] && [[ -f "$REVIEW_ACCEPTOR" ]]; then
    if "$PYTHON" "$REVIEW_ACCEPTOR" --item-json "$item_json" --timeout-sec "$REVIEW_ACCEPT_TIMEOUT_SEC" >"$review_json" 2>>"$MAIN_LOG"; then
      review_status="$(jq -r '.status // "unknown"' <"$review_json" 2>/dev/null || echo "unknown")"
      manual_review_required="$(jq -r '.manual_review_required // false' <"$review_json" 2>/dev/null || echo "false")"
      log "review_acceptor id=$qid status=$review_status manual_review_required=$manual_review_required"
    else
      log "review_acceptor_failed id=$qid"
      jq -n --arg st "acceptor_error" --argjson mr true '{ok:false,status:$st,manual_review_required:$mr}' >"$review_json" || true
      review_status="acceptor_error"
      manual_review_required="true"
    fi
  fi

  local manifest state report session_log
  manifest="$LOG_DIR/cursor_job_session_manifest_${ts}.json"
  state="$LOG_DIR/mac_executor_state_${ts}.json"
  report="$LOG_DIR/dangerous_patch_block_report_${ts}.json"
  session_log="$LOG_DIR/cursor_session_watch_${ts}.log"

  jq -n \
    --arg ts "$ts" \
    --arg qid "$qid" \
    '{stub:true,card:"TENMON_MAC_WATCH_LOOP",ts:$ts,queue_id:$qid,dry_run:true}' >"$manifest"
  jq -n \
    --arg ts "$ts" \
    --arg qid "$qid" \
    '{stub:true,state:"dry_run_started",queue_id:$qid,ts:$ts}' >"$state"
  jq -n \
    --arg ts "$ts" \
    '{stub:true,blocked:[],ts:$ts}' >"$report"
  : >"$session_log"
  echo "watch_loop tick=$ts id=$qid dry_run=1" >>"$session_log"

  body_file="$(mktemp)"
  jq -n \
    --arg id "$qid" \
    --arg jid "$jid" \
    --arg sid "watch_${ts}" \
    --arg mp "$manifest" \
    --arg st "$state" \
    --arg rp "$report" \
    --arg lp "$session_log" \
    --arg ras "$review_status" \
    --arg rj "$review_json" \
    --argjson mrr "$manual_review_required" \
    '{
      id:$id, queue_id:$id, job_id:$jid,
      status:"dry_run_started",
      result_type:"executor_session",
      session_id:$sid,
      cursor_job_session_manifest:$mp,
      mac_executor_state:$st,
      dangerous_patch_block_report:$rp,
      log_path:$lp,
      review_acceptor_status:$ras,
      review_acceptor_output_path:$rj,
      manual_review_required:$mrr,
      current_run:true
    }' >"$body_file"

  http_out="$LOG_DIR/result_${ts}.json"
  if ! curl -fsS -X POST "$BASE/api/admin/cursor/result" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d @"$body_file" >"$http_out"; then
    log "result_post_failed id=$qid"
  else
    log "result_post_ok id=$qid transition=$(jq -r '.transition // ""' <"$http_out")"
  fi
  rm -f "$body_file"
}

require_jq
log "start BASE=$BASE POLL_SEC=$POLL_SEC MAC_HOME=$MAC_HOME"

if [[ "${TENMON_WATCH_ONE_SHOT:-0}" == "1" ]]; then
  tick
  exit 0
fi

while true; do
  tick || true
  sleep "$POLL_SEC"
done
