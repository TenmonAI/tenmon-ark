# TENMON_FULL_AUTONOMY_OS_13PLUS4_MASTER_PARENT_CURSOR_AUTO_V1

## 目的

TENMON-ARK を、Cursor / Mac / 外部 AI 相談 / build / acceptance / rollback / 再投入まで含む **完全自律構築 OS** へ段階到達させるための **親カード（主線 13 + 保険 4）** を固定する。

## 実装（オーケストレータ）

- `api/automation/tenmon_full_autonomy_os_13plus4_master_parent_v1.py`
- `api/scripts/tenmon_full_autonomy_os_13plus4_master_parent_v1.sh`

### 出力（single-source）

- `api/automation/tenmon_full_autonomy_os_13plus4_master_summary.json`
- `api/automation/tenmon_full_autonomy_os_13plus4_master_report.md`
- FAIL 時: `api/automation/generated_cursor_apply/TENMON_FULL_AUTONOMY_OS_13PLUS4_MASTER_PARENT_RETRY_CURSOR_AUTO_V1.md`

## 主線 13（固定順・現状の runner 対応）

| # | カード | 実行 |
|---|--------|------|
| 1 | `TENMON_MAC_WATCH_LOOP_REAL_EXECUTION_ENABLE_FOR_APPROVED_HIGH_RISK_CURSOR_AUTO_V1` | constitution 実在チェック |
| 2 | `TENMON_CURSOR_EXECUTOR_REAL_RESULT_AND_TOUCHFILES_BIND_CURSOR_AUTO_V1` | `tenmon_autonomy_result_bind_to_rejudge_and_acceptance_v1.sh` |
| 3 | `TENMON_APPROVED_HIGH_RISK_REAL_RUN_GUARD_AND_AUDIT_CURSOR_AUTO_V1` | `tenmon_high_risk_approval_contract_v1.sh` |
| 4 | `TENMON_BROWSER_AI_OPERATOR_MAC_RUNTIME_CURSOR_AUTO_V1` | Darwin のみ `tenmon_browser_ai_operator_runtime_v1.sh` |
| 5 | `TENMON_BROWSER_SESSION_AND_LOGIN_PERSISTENCE_CURSOR_AUTO_V1` | **runner 未配線**（`skipped_no_runner`） |
| 6 | `TENMON_SCREEN_OBSERVE_AND_ACTION_SELECT_CURSOR_AUTO_V1` | Darwin のみ `tenmon_mac_screen_operator_runtime_v1.sh` |
| 7 | `TENMON_GPT_CLAUDE_GEMINI_ROLE_ROUTER_CURSOR_AUTO_V1` | **runner 未配線** |
| 8 | `TENMON_MULTI_MODEL_CONSENSUS_AND_CONFLICT_RESOLVER_CURSOR_AUTO_V1` | **runner 未配線** |
| 9 | `TENMON_MODEL_ADVICE_TO_CURSOR_PATCH_PLAN_BRIDGE_CURSOR_AUTO_V1` | `tenmon_safe_patch_planner_v1.sh`（rc 0/1 を観測完了として許容） |
| 10 | `TENMON_BUILD_PROBE_ROLLBACK_AUTOGUARD_CURSOR_AUTO_V1` | `tenmon_verify_rejudge_rollback_loop_v1.sh`（既定 **rc 0 のみ PASS**） |
| 11 | `TENMON_ACCEPTANCE_GATED_SELF_COMMIT_AND_REQUEUE_CURSOR_AUTO_V1` | `tenmon_full_autonomy_acceptance_gate_v1.sh` → `tenmon_autonomy_priority_loop_to_remote_queue_enqueue_v1.sh` |
| 12 | `TENMON_OVERNIGHT_FULL_PDCA_AUTONOMY_ORCHESTRATOR_CURSOR_AUTO_V1` | `--run-heavy` または `TENMON_OS13PLUS4_RUN_HEAVY=1` 時のみ `tenmon_overnight_full_autonomy_completion_loop_v1.sh` |
| 13 | `TENMON_DAYBREAK_REPORT_AND_NEXT_QUEUE_REARM_CURSOR_AUTO_V1` | `tenmon_autonomy_current_state_forensic_v1.sh` → `tenmon_worldclass_dialogue_acceptance_priority_loop_v1.sh` |

## 保険 4

| # | カード | 実行 |
|---|--------|------|
| 14 | `TENMON_CURSOR_REVIEW_ACCEPTOR_RUNTIME_CURSOR_AUTO_V1` | `cursor_review_acceptor_v1.py`（実体は既存 `TENMON_CURSOR_AGENT_REVIEW_BYPASS_OR_SINGLE_ACCEPT_RUNTIME` と同一ファイル） |
| 15 | `TENMON_NETWORK_SESSION_RESCUE_AND_TOKEN_RECOVERY_CURSOR_AUTO_V1` | `tenmon_continuous_runtime_health_rescue_v1.py` |
| 16 | `TENMON_QUEUE_DEDUP_BACKPRESSURE_AND_FIXTURE_DRAIN_CURSOR_AUTO_V1` | `tenmon_continuous_queue_dedup_and_backpressure_v1.py` |
| 17 | `TENMON_SAFE_STOP_HUMAN_OVERRIDE_AND_FAIL_CLOSED_CURSOR_AUTO_V1` | `safe_stop_human_override_v1.py --exit-on-block`（rc 0/1 許容＝横断停止時 fail-closed） |

## 環境変数・フラグ

| 名前 | 説明 |
|------|------|
| `TENMON_OS13PLUS4_RUN_HEAVY` | `1` で主線 12 を実行 |
| `TENMON_OS13PLUS4_RELAX_VERIFY_ROLLBACK` | `1` または `--relax-verify-rollback` で主線 10 の rc=1 を許容（閉路未成立の開発向け） |
| `TENMON_OS13PLUS4_STEP_TIMEOUT_SEC` | 各 runner のタイムアウト秒（既定 2400） |

## 非交渉（D）

- 最小 diff・1 変更=1 検証
- success 捏造禁止（`skipped_no_runner` / `ok_warn` を summary に明示）
- high-risk は承認ゲート維持
- dist 直編集禁止
- build → restart → audit → acceptance の順は **各子カード／既存シェルの契約に従う**（親は順序固定で呼び出す）
- FAIL 時は summary + retry stub を残して停止
- product core 無差別改変禁止（親オーケストレータは観測・既存 runner の呼び出しのみ）
- queue / result / scorecard 契約不変
- Mac ローカル path 既定を壊さない

## nextOnPass

`TENMON_MAC_WATCH_LOOP_REAL_EXECUTION_ENABLE_FOR_APPROVED_HIGH_RISK_CURSOR_AUTO_V1`

## nextOnFail

停止。`TENMON_FULL_AUTONOMY_OS_13PLUS4_MASTER_PARENT_RETRY_CURSOR_AUTO_V1`（safe retry 1 枚）のみ生成。

## 完了条件（親の解釈）

- `master_pass=true`: 途中 halt なし、かつ各 step が `ok` / `ok_warn` / 正当な skip
- `roadmap_complete_no_gaps=true`: 主線の `skipped_no_runner` が 0（5/7/8 の runner 配線後に真になる想定）

*Version: 1*
