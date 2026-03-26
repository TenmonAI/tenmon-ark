# TENMON_FINAL_AUTONOMY_LAST_MILE_PARENT_CURSOR_AUTO_V1

## 目的

「自動観測 OS」から、**承認済み high-risk の実実行・browser AI→patch plan・build/rollback/acceptance・queue 再武装・常駐/停滞回復/朝レポート・PWA 会話 final ascent・final seal** までを 1 本の固定順で回し、設置後放置に近い自律施工体へ寄せる。

## 制約

- 最小 diff・1 ステップ 1 runner 実行・fail-closed・high-risk は承認前提（`tenmon_high_risk_approval_contract`）・成功捏造禁止・`dist/` 直編集禁止・既存 queue / result / scorecard 契約は本親が変更しない。

## 実装

- `api/automation/tenmon_final_autonomy_last_mile_parent_v1.py`
- 出力: `api/automation/tenmon_final_autonomy_last_mile_parent_summary.json` / `tenmon_final_autonomy_last_mile_parent_report.md`

## 実行順（カード名 ↔ 現状の runner 配線）

| # | カード | 配線（既存） |
|---|--------|----------------|
| 1 | `TENMON_MAC_RUNTIME_REDEPLOY_AND_RESTART_RUNBOOK_CURSOR_AUTO_V1` | Darwin: `scripts/tenmon_mac_cursor_executor_runtime_bind_v1.sh`（専用 runbook 未配線のため bind に寄せる）。非 Darwin: `skipped_mac_only`。 |
| 2 | `TENMON_APPROVED_HIGH_RISK_REAL_RUN_ACCEPTANCE_CHAIN_CURSOR_AUTO_V1` | `tenmon_high_risk_approval_contract_v1.sh` → `tenmon_autonomy_result_bind_to_rejudge_and_acceptance_v1.sh` → Darwin: `TENMON_WATCH_ONE_SHOT=1` の `tenmon_cursor_watch_loop.sh`。 |
| 3 | `TENMON_BROWSER_AI_CONSULT_TO_PATCHPLAN_MAINLINE_CURSOR_AUTO_V1` | Darwin: `tenmon_browser_ai_operator_runtime_v1.sh` → `tenmon_safe_patch_planner_v1.sh`。Linux: planner のみ。planner の rc=1 は 13+4 主線と同様 **観測完了として許容**（`ok_warn`）。 |
| 4 | `TENMON_AUTONOMY_SYSTEMD_INSTALL_AND_PERSISTENT_BOOT_CURSOR_AUTO_V1` | `install_tenmon_operations_level_autonomy_timer_v1.sh`（`SKIP_SYSTEMCTL_INSTALL` 等は既存スクリプトの挙動に従う）。 |
| 5 | `TENMON_AUTONOMY_HEARTBEAT_ALERT_AND_STALL_RECOVERY_CURSOR_AUTO_V1` | `tenmon_continuous_runtime_health_rescue_v1.py`（専用 heartbeat runner 未配線のため rescue に寄せる）。 |
| 6 | `TENMON_AUTONOMY_MORNING_APPROVAL_EXECUTION_CHAIN_CURSOR_AUTO_V1` | `tenmon_conversation_worldclass_mainline_selector_v1.py` → `daybreak_report_and_next_queue_rearm_v1.py`（queue は変更しない）。 |
| 7 | `TENMON_PWA_WORLDCLASS_DIALOGUE_FINAL_ASCENT_CURSOR_AUTO_V1` | `tenmon_worldclass_dialogue_acceptance_priority_loop_v1.sh` |
| 8 | `TENMON_FINAL_AUTONOMY_SEAL_AND_HANDS_OFF_OPERATION_CURSOR_AUTO_V1` | `tenmon_pwa_lived_proof_worldclass_seal_v1.py` → `release_freeze_and_autonomy_constitution_seal_v1.py`（evidence ベース・失敗時 rc≠0）。 |

## 合格判定

- `master_pass`: 中断なし、かつ各 step の `status` が `ok` / `ok_warn` / `skipped_mac_only` のいずれか。
- いずれかが `fail` なら `halted`・exit **1**・`generated_cursor_apply/TENMON_FINAL_AUTONOMY_LAST_MILE_PARENT_CURSOR_AUTO_V1.md` に retry stub。

## 環境変数

- `TENMON_REPO_ROOT`
- `TENMON_LAST_MILE_STEP_TIMEOUT_SEC`（既定 3600）
- watch loop: `TENMON_REMOTE_CURSOR_BASE_URL` 等（既存 watch 契約）
- PWA seal: `TENMON_PWA_SEAL_API_BASE` 等（既存 seal 契約）

## next

- **nextOnPass**: `TENMON_MAC_RUNTIME_REDEPLOY_AND_RESTART_RUNBOOK_CURSOR_AUTO_V1`（再駆動で runbook 実装へ）
- **nextOnFail**: 停止。safe retry は本カード 1 枚のみ。
