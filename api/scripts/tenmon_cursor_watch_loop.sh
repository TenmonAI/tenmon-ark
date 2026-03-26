#!/usr/bin/env bash
# TENMON_MAC_WATCH_LOOP_REFRESH_AUTH_AND_NONFIXTURE_RUNTIME_CURSOR_AUTO_V1
# TENMON_APPROVED_HIGH_RISK_REAL_RUN_GUARD_AND_AUDIT_CURSOR_AUTO_V1（fail-closed）
# Mac 常駐: refresh で Bearer を都度取得 → /queue → /next（non-fixture 優先は API 側）→
# non-fixture は原則 dry-run 証跡。**承認済み high-risk（escrow_approved・current_run 明示 true）のみ** real（CURSOR_EXECUTOR_DRY_RUN=0）。
# high-risk の real は escrow 未承認では絶対に起動しない（REAL_EXEC_REQUIRE_ESCROW の緩和で逃げない）。
# fixture は release のみ（完了にしない）。本ファイル先頭に CURSOR_EXECUTOR_DRY_RUN の固定 export を置かないこと。
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
FORCE_DRY_RUN="${TENMON_FORCE_DRY_RUN:-0}"
REAL_EXEC_REQUIRE_ESCROW="${TENMON_REAL_EXEC_REQUIRE_ESCROW_APPROVED:-1}"

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
  local ts qid jid fixture body_file http_out item_json
  local escrow_approved dry_run_only item_current_run item_current_run_post_json
  local dry_run_flag want_real dry_run_status
  local git_repo_root pre_files post_files touched_files touched_json
  local manifest state report session_log
  local item_escrow_json
  local cursor_card high_risk enqueue_reason real_guard_failed executor_failed
  local git_status_audit_file
  local hr_chain_attempted hr_acc hr_rb hr_cr hr_br_str ag_dir pp tf bp_res acc_out qpath
  hr_chain_attempted="false"
  hr_acc="false"
  hr_rb="false"
  hr_cr="false"
  hr_br_str="null"
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
  log "auth_refresh_ok"

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
  escrow_approved="$(echo "$next_json" | jq -r '.item.escrow_approved // false')"
  dry_run_only="$(echo "$next_json" | jq -r '.item.dry_run_only // false')"
  # real 判定: current_run は JSON で明示 true のときのみ（null は current-run ジョブとして POST は true 寄せ）
  item_current_run="$(echo "$next_json" | jq -r 'if .item.current_run == true then "true" else "false" end')"
  item_current_run_post_json="$(echo "$next_json" | jq -c 'if .item.current_run == null or .item.current_run == true then true else false end')"
  item_escrow_json="$(echo "$next_json" | jq -c '.item.escrow_approved // false')"
  cursor_card="$(echo "$next_json" | jq -r '(.item.cursor_card // .item.card_name // "") | tostring' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  enqueue_reason="$(echo "$next_json" | jq -r '.item.enqueue_reason // ""')"
  high_risk="$(echo "$next_json" | jq -r 'if (.item.high_risk == true) or (.item.risk_tier == "high") then "true" else "false" end')"
  # high-risk escrow 経路（bridge が high_risk フラグを付けない場合の単一真実源）
  if [[ "$high_risk" != "true" ]] && [[ "$enqueue_reason" == "escrow_human_approval" ]]; then
    high_risk="true"
  fi
  if [[ -z "$qid" ]]; then
    log "item_missing_id"
    return 0
  fi
  log "next_ok_item id=$qid fixture=$fixture current_run=$item_current_run dry_run_only=$dry_run_only escrow_approved=$escrow_approved high_risk=${high_risk} enqueue_reason=${enqueue_reason}"

  if [[ "$fixture" == "true" ]]; then
    log "fixture_delivered releasing id=$qid (no result completion)"
    curl -fsS -X POST "$BASE/api/admin/cursor/release" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$(jq -n --arg id "$qid" '{id:$id}')" >"$LOG_DIR/release_fixture_${ts}.json" || log "release_failed id=$qid"
    return 0
  fi

  # real: **high-risk のみ** ∧ non-fixture ∧ ¬dry_run_only ∧ current_run 明示 true ∧ escrow_approved（必須）∧ ¬FORCE_DRY_RUN
  # 上記以外の non-fixture は常に dry-run（一般ジョブを勝手に本実行しない）
  want_real=0
  if [[ "${FORCE_DRY_RUN}" == "1" ]]; then
    want_real=0
  elif [[ "${dry_run_only}" == "true" ]]; then
    want_real=0
  elif [[ "${item_current_run}" != "true" ]]; then
    want_real=0
  elif [[ "${high_risk}" != "true" ]]; then
    want_real=0
  elif [[ "${escrow_approved}" != "true" ]]; then
    want_real=0
  else
    want_real=1
  fi

  git_repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
  real_guard_failed=0
  if [[ "${want_real}" -eq 1 ]]; then
    local gf
    gf=""
    [[ "${fixture}" == "true" ]] && gf+="${gf:+,}fixture_true"
    [[ "${item_current_run}" != "true" ]] && gf+="${gf:+,}current_run_not_true"
    [[ "${escrow_approved}" != "true" ]] && gf+="${gf:+,}escrow_not_approved"
    [[ -z "${cursor_card// }" ]] && gf+="${gf:+,}cursor_card_empty"
    if [[ "${high_risk}" == "true" ]] && [[ "${escrow_approved}" != "true" ]]; then
      gf+="${gf:+,}high_risk_unapproved"
    fi
    if [[ -n "${gf}" ]]; then
      log "real_guard_fail id=$qid reason=${gf}"
      want_real=0
      real_guard_failed=1
      git_status_audit_file="$LOG_DIR/git_status_guardfail_${ts}_${qid}.txt"
      if [[ -n "${git_repo_root}" ]]; then
        git -C "${git_repo_root}" status --porcelain -uall >"${git_status_audit_file}" 2>/dev/null || : >"${git_status_audit_file}"
      else
        : >"${git_status_audit_file}"
      fi
      local tf_guard _paths
      tf_guard="[]"
      if [[ -n "${git_repo_root}" ]]; then
        _paths="$(git -C "${git_repo_root}" status --porcelain -uall 2>/dev/null | awk '{print $NF}' | sort -u)"
        if [[ -n "${_paths}" ]]; then
          tf_guard="$(printf '%s\n' "${_paths}" | jq -R . | jq -s .)"
        fi
      fi
      jq -n \
        --arg qid "$qid" \
        --arg sid "watch_dry_${ts}_${qid}" \
        --arg slog "$LOG_DIR/cursor_session_watch_dry_${ts}_${qid}.log" \
        --arg gsf "${git_status_audit_file}" \
        --argjson tf "${tf_guard}" \
        --arg rs "${gf}" \
        '{kind:"guard_fail",event:"real_guard_fail",reasons:($rs|split(",")|map(select(length>0))),queue_id:$qid,session_id:$sid,session_log:$slog,touched_files:$tf,git_status_path:$gsf}' \
        >"$LOG_DIR/real_execution_audit_guardfail_${ts}_${qid}.json"
    else
      local card_log
      card_log="${cursor_card:0:240}"
      log "real_guard_pass id=$qid card=${card_log}"
    fi
  fi

  dry_run_flag="1"
  dry_run_status="dry_run_started"
  local exec_mode session_id
  exec_mode="dry"
  session_id="watch_dry_${ts}_${qid}"
  if [[ "${want_real}" -eq 1 ]]; then
    dry_run_flag="0"
    dry_run_status="started"
    exec_mode="real"
    session_id="watch_real_${ts}_${qid}"
    # real: 最終 status は後段の final_status（dry_run_started は dry のみ）
  fi
  log "exec_decision id=$qid want_real=${want_real} dry_run_flag=${dry_run_flag} force_dry=${FORCE_DRY_RUN} require_escrow=${REAL_EXEC_REQUIRE_ESCROW} exec_mode=${exec_mode} high_risk=${high_risk}"

  # real execution の場合のみ touched_files を差分で取得
  if [[ "${dry_run_flag}" == "0" && -n "${git_repo_root}" ]]; then
    pre_files="$(git -C "${git_repo_root}" status --porcelain -uall 2>/dev/null | awk '{print $NF}' | sort -u || true)"
  else
    pre_files=""
  fi

  export CURSOR_EXECUTOR_DRY_RUN="${dry_run_flag}"
  item_json="$LOG_DIR/item_${exec_mode}_${ts}_${qid}.json"
  echo "$next_json" | jq -c '.item' >"$item_json"
  session_log="$LOG_DIR/cursor_session_watch_${exec_mode}_${ts}_${qid}.log"
  local executor_log
  executor_log="$LOG_DIR/executor_${exec_mode}_${ts}_${qid}.log"
  executor_failed=0
  report=""
  if [[ "${dry_run_flag}" == "0" ]]; then
    report="$LOG_DIR/dangerous_patch_block_report_real_${ts}_${qid}.json"
    jq -n \
      --arg ts "$ts" \
      --arg qid "$qid" \
      '{stub:true,mode:"real",ts:$ts,queue_id:$qid,blocked:[]}' >"$report"
  fi
  if [[ -n "$EXECUTOR_CMD" ]]; then
    if [[ "${dry_run_flag}" == "0" ]]; then
      log "executor_real_run_cmd id=$qid"
    else
      log "executor_dry_run_cmd id=$qid"
    fi
    export TENMON_WATCH_ITEM_JSON="$item_json"
    if bash -c "$EXECUTOR_CMD" >>"${executor_log}" 2>&1; then
      :
    else
      executor_failed=1
      log "executor_nonzero_exit id=$qid"
    fi
  elif [[ -f "$EXECUTOR_PY" ]]; then
    if [[ "${dry_run_flag}" == "0" ]]; then
      log "executor_real_run id=$qid py=$EXECUTOR_PY"
    else
      log "executor_dry_run id=$qid py=$EXECUTOR_PY"
    fi
    if "$PYTHON" "$EXECUTOR_PY" "$item_json" >>"${executor_log}" 2>&1; then
      :
    else
      executor_failed=1
      log "executor_nonzero_exit id=$qid"
    fi
  else
    log "no_executor stub_logs_only id=$qid (set TENMON_MAC_EXECUTOR_PY or TENMON_MAC_EXECUTOR_CMD)"
  fi

  local review_json review_status manual_review_required
  review_json="$LOG_DIR/review_accept_${exec_mode}_${ts}_${qid}.json"
  review_status="skipped"
  manual_review_required="false"
  if [[ "$REVIEW_ACCEPT_ENABLE" == "1" ]] && [[ -f "$REVIEW_ACCEPTOR" ]]; then
    if "$PYTHON" "$REVIEW_ACCEPTOR" --manifest "$item_json" --timeout-sec "$REVIEW_ACCEPT_TIMEOUT_SEC" >"$review_json" 2>>"$MAIN_LOG"; then
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

  manifest=""
  state=""
  if [[ "${dry_run_flag}" == "1" ]]; then
    manifest="$LOG_DIR/cursor_job_session_manifest_dry_${ts}_${qid}.json"
    state="$LOG_DIR/mac_executor_state_dry_${ts}_${qid}.json"
    report="$LOG_DIR/dangerous_patch_block_report_dry_${ts}_${qid}.json"
    jq -n \
      --arg ts "$ts" \
      --arg qid "$qid" \
      --argjson dry_run_bool "${dry_run_flag}" \
      '{stub:true,card:"TENMON_MAC_WATCH_LOOP",ts:$ts,queue_id:$qid,dry_run:($dry_run_bool==1)}' >"$manifest"
    jq -n \
      --arg ts "$ts" \
      --arg qid "$qid" \
      --arg st "$dry_run_status" \
      '{stub:true,state:$st,queue_id:$qid,ts:$ts}' >"$state"
    jq -n \
      --arg ts "$ts" \
      '{stub:true,blocked:[],ts:$ts}' >"$report"
  fi
  : >"$session_log"

  # touched_files（real のときのみ）
  touched_files=""
  touched_json="[]"
  if [[ "${dry_run_flag}" == "0" && -n "${git_repo_root}" ]]; then
    post_files="$(git -C "${git_repo_root}" status --porcelain -uall 2>/dev/null | awk '{print $NF}' | sort -u || true)"
    touched_files="$(comm -13 <(printf '%s\n' "${pre_files}" | sort -u) <(printf '%s\n' "${post_files}" | sort -u) || true)"
    touched_files="$(printf '%s\n' "${touched_files}" | awk 'NF>0' || true)"
    if [[ -n "${touched_files}" ]]; then
      touched_json="$(printf '%s\n' "${touched_files}" | jq -R . | jq -s .)"
    fi
  fi

  echo "watch_loop tick=$ts id=$qid dry_run=${dry_run_flag}" >>"$session_log"

  if [[ "${executor_failed}" -eq 1 ]] && [[ "${dry_run_flag}" == "0" ]]; then
    git_status_audit_file="$LOG_DIR/git_status_executorfail_${ts}_${qid}.txt"
    if [[ -n "${git_repo_root}" ]]; then
      git -C "${git_repo_root}" status --porcelain -uall >"${git_status_audit_file}" 2>/dev/null || : >"${git_status_audit_file}"
    else
      : >"${git_status_audit_file}"
    fi
    jq -n \
      --arg qid "$qid" \
      --arg sid "$session_id" \
      --arg slog "$session_log" \
      --arg gsf "${git_status_audit_file}" \
      --argjson tf "${touched_json}" \
      '{kind:"executor_fail",event:"executor_nonzero_exit",queue_id:$qid,session_id:$sid,session_log:$slog,touched_files:$tf,git_status_path:$gsf}' \
      >"$LOG_DIR/real_execution_audit_executorfail_${ts}_${qid}.json"
  fi

  # --- TENMON_APPROVED_HIGH_RISK_REAL_RUN_ACCEPTANCE_CHAIN: touched → autoguard → acceptance（捏造なし）---
  if [[ "${dry_run_flag}" == "0" && "${high_risk}" == "true" && "${escrow_approved}" == "true" && "${executor_failed}" -eq 0 && "${TENMON_WATCH_HIGH_RISK_ACCEPTANCE_CHAIN:-1}" == "1" && -n "${git_repo_root}" && -f "${git_repo_root}/api/automation/build_probe_rollback_autoguard_v1.py" ]]; then
    hr_chain_attempted="true"
    ag_dir="$LOG_DIR/autoguard_${ts}_${qid}"
    mkdir -p "$ag_dir"
    pp="$LOG_DIR/cursor_patch_plan_watch_${ts}_${qid}.json"
    tf="$LOG_DIR/touched_files_watch_${ts}_${qid}.json"
    echo "${touched_json}" >"$tf"
    jq -n \
      --arg c "${cursor_card}" \
      --argjson tf "${touched_json}" \
      '{ok:true,card:$c,target_files:$tf,problem:"TENMON_APPROVED_HIGH_RISK_REAL_RUN_ACCEPTANCE_CHAIN",risk_class:"high",change_scope:"mac_watch_loop"}' \
      >"$pp"
    bp_res="${ag_dir}/build_probe_rollback_result.json"
    if ! TENMON_REPO_ROOT="${git_repo_root}" TENMON_AUTOGUARD_API_BASE="${TENMON_AUTOGUARD_API_BASE:-$BASE}" \
      "$PYTHON" "${git_repo_root}/api/automation/build_probe_rollback_autoguard_v1.py" \
      --patch-plan "$pp" \
      --touched-files "$tf" \
      --output-dir "$ag_dir" >>"${ag_dir}/autoguard_run.log" 2>&1; then
      log "high_risk_autoguard_nonzero id=$qid (see ${ag_dir}/autoguard_run.log)"
    fi
    if [[ -f "$bp_res" ]]; then
      hr_acc="$(jq -r 'if .overall_pass == true then "true" else "false" end' "$bp_res")"
      hr_rb="$(jq -r 'if .rollback_executed == true then "true" else "false" end' "$bp_res")"
      hr_br_str="$(jq -r 'if .build_rc == null then "null" else (.build_rc|tostring) end' "$bp_res")"
    else
      hr_acc="false"
      hr_rb="false"
      hr_br_str="null"
      log "high_risk_autoguard_missing_result id=$qid dir=$ag_dir"
    fi
    qpath="${TENMON_REMOTE_CURSOR_QUEUE_PATH:-${git_repo_root}/api/automation/remote_cursor_queue.json}"
    acc_out="$LOG_DIR/acceptance_commit_watch_${ts}_${qid}.json"
    if [[ -f "$bp_res" && -f "$qpath" ]]; then
      if ! TENMON_REPO_ROOT="${git_repo_root}" \
        "$PYTHON" "${git_repo_root}/api/automation/acceptance_gated_self_commit_and_requeue_v1.py" \
        --build-probe-result "$bp_res" \
        --patch-plan "$pp" \
        --remote-cursor-queue "$qpath" \
        --output-file "$acc_out" >>"${ag_dir}/acceptance_gated.log" 2>&1; then
        log "high_risk_acceptance_gated_nonzero id=$qid"
      fi
    else
      log "high_risk_acceptance_gated_skip id=$qid missing_bp_or_queue bp=${bp_res} q=${qpath}"
    fi
    if [[ -f "$acc_out" ]]; then
      hr_cr="$(jq -r 'if .commit_ready == true then "true" else "false" end' "$acc_out")"
    else
      hr_cr="false"
    fi
    log "high_risk_chain id=$qid acceptance_ok=${hr_acc} rollback_executed=${hr_rb} build_rc=${hr_br_str} commit_ready=${hr_cr}"
  fi

  # --- TENMON_REAL_EXECUTION_RESULT_EVIDENCE_BIND: real の status は dry_run_started を禁止。evidence 束 ---
  local final_status no_diff_reason_val git_status_evidence_path executor_configured
  final_status=""
  no_diff_reason_val=""
  git_status_evidence_path=""
  executor_configured="false"
  if [[ -n "${EXECUTOR_CMD}" ]] || [[ -f "${EXECUTOR_PY:-}" ]]; then
    executor_configured="true"
  fi

  git_status_evidence_path=""
  if [[ "${dry_run_flag}" == "1" ]]; then
    final_status="dry_run_started"
  else
    git_status_evidence_path="$LOG_DIR/git_status_post_${ts}_${qid}.txt"
    if [[ -n "${git_repo_root}" ]]; then
      git -C "${git_repo_root}" status --porcelain -uall >"${git_status_evidence_path}" 2>/dev/null || : >"${git_status_evidence_path}"
    else
      : >"${git_status_evidence_path}"
    fi
    if [[ "${executor_failed}" -eq 1 ]]; then
      final_status="executor_failed"
      git_status_evidence_path="${git_status_audit_file:-$git_status_evidence_path}"
    elif [[ "${hr_chain_attempted}" == "true" ]] && [[ "${hr_acc}" == "true" ]] && [[ "${hr_rb}" != "true" ]]; then
      final_status="completed"
    elif [[ -n "${touched_files}" ]]; then
      final_status="completed"
    else
      final_status="completed_no_diff"
      if [[ "${executor_configured}" != "true" ]]; then
        no_diff_reason_val="no_executor_configured"
      elif [[ "${manual_review_required}" == "true" ]] || [[ "${review_status}" == "acceptor_error" ]]; then
        no_diff_reason_val="review_not_applied"
      elif [[ "${hr_chain_attempted}" == "true" ]] && [[ "${hr_rb}" == "true" ]]; then
        no_diff_reason_val="patch_already_applied"
      elif [[ "${hr_chain_attempted}" == "true" ]] && [[ "${hr_acc}" != "true" ]]; then
        no_diff_reason_val="acceptance_gated_fail"
      else
        no_diff_reason_val="executor_opened_but_no_change"
      fi
    fi
  fi

  # --- real execution の status / no-diff 契約を fail-closed で正規化 ---
  if [[ "${dry_run_flag}" == "0" ]]; then
    # real で dry_run_started は禁止（異常系は started に丸める）
    if [[ "${final_status}" == "dry_run_started" ]]; then
      final_status="started"
    fi
    # 実差分が無い completed は completed_no_diff へ寄せ、理由を必須化
    if [[ -z "${touched_files}" ]] && [[ "${final_status}" == "completed" || "${final_status}" == "started" ]]; then
      final_status="completed_no_diff"
    fi
    if [[ "${final_status}" == "completed_no_diff" ]] && [[ -z "${no_diff_reason_val}" ]]; then
      if [[ "${executor_configured}" != "true" ]]; then
        no_diff_reason_val="no_executor_configured"
      elif [[ "${manual_review_required}" == "true" ]] || [[ "${review_status}" == "acceptor_error" ]]; then
        no_diff_reason_val="review_not_applied"
      elif [[ "${hr_chain_attempted}" == "true" ]] && [[ "${hr_rb}" == "true" ]]; then
        no_diff_reason_val="patch_already_applied"
      elif [[ "${hr_chain_attempted}" == "true" ]] && [[ "${hr_acc}" != "true" ]]; then
        no_diff_reason_val="acceptance_gated_fail"
      else
        no_diff_reason_val="executor_opened_but_no_change"
      fi
    fi
  fi

  body_file="$(mktemp)"
  jq -n \
    --arg id "$qid" \
    --arg jid "$jid" \
    --arg sid "$session_id" \
    --arg mp "$manifest" \
    --arg st "$state" \
    --arg rp "$report" \
    --arg lp "$session_log" \
    --arg elp "${executor_log}" \
    --arg fst "$final_status" \
    --arg emode "$exec_mode" \
    --arg slp "$session_log" \
    --arg gsp "${git_status_evidence_path}" \
    --arg ndr "$no_diff_reason_val" \
    --arg ras "$review_status" \
    --arg rj "$review_json" \
    --argjson mrr "$manual_review_required" \
    --argjson touched_files "$touched_json" \
    --argjson dry_run_bool "${dry_run_flag}" \
    --argjson item_current_run "$item_current_run_post_json" \
    --argjson item_escrow_approved "$item_escrow_json" \
    --arg hrc "${hr_chain_attempted}" \
    --arg acc "${hr_acc}" \
    --arg rb "${hr_rb}" \
    --arg cr "${hr_cr}" \
    --arg brs "${hr_br_str}" \
    '{
      id:$id, queue_id:$id, job_id:$jid,
      status:$fst,
      result_type:"executor_session",
      session_id:$sid,
      cursor_job_session_manifest:(if ($mp|length) > 0 then $mp else "" end),
      mac_executor_state:(if ($st|length) > 0 then $st else "" end),
      dangerous_patch_block_report:(if ($rp|length) > 0 then $rp else "" end),
      log_path:(if ($dry_run_bool==1) then $lp else $elp end),
      session_log_path:$slp,
      git_status_path:(if ($gsp|length) > 0 then $gsp else null end),
      review_acceptor_status:$ras,
      review_acceptor_output_path:$rj,
      manual_review_required:$mrr,
      current_run:$item_current_run,
      touched_files:(if ($dry_run_bool==1) then [] else $touched_files end),
      no_diff_reason:(if ($dry_run_bool==1) then null elif ($ndr|length) > 0 then $ndr else null end),
      dry_run:($dry_run_bool==1),
      real_execution:($dry_run_bool==0),
      real_execution_enabled:($dry_run_bool==0),
      executor_mode:$emode,
      escrow_approved:$item_escrow_approved,
      high_risk_acceptance_chain_attempted:($hrc == "true"),
      acceptance_ok:(if ($hrc == "true") then ($acc == "true") else null end),
      rollback_executed:(if ($hrc == "true") then ($rb == "true") else false end),
      commit_ready:(if ($hrc == "true") then ($cr == "true") else false end),
      build_rc:(if ($hrc == "true") and ($brs != "null") and ($brs != "") then ($brs | tonumber) elif ($hrc == "true") then null else null end)
    }' >"$body_file"

  http_out="$LOG_DIR/result_${exec_mode}_${ts}_${qid}.json"
  local re_log
  re_log="false"
  [[ "${dry_run_flag}" == "0" ]] && re_log="true"
  if ! curl -fsS -X POST "$BASE/api/admin/cursor/result" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d @"$body_file" >"$http_out"; then
    log "result_post_failed id=$qid queue_id=$qid session_id=$session_id real_execution_enabled=${re_log}"
  else
    log "result_post_ok id=$qid queue_id=$qid session_id=$session_id real_execution_enabled=${re_log} transition=$(jq -r '.transition // ""' <"$http_out")"
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
