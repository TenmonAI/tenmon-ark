# TENMON_OVERNIGHT_FULL_PDCA_AUTONOMY_ORCHESTRATOR_CURSOR_AUTO_V1

## 目的

**観測 → dedup → role router → browser 相談（任意）→ consensus → patch plan → build/probe/rollback → acceptance gated → result bind → scorecard → heartbeat** を夜間反復する full PDCA オーケストレータ。既存 `tenmon_continuous_self_improvement_overnight_daemon_v1` は**別 lock/stop**で壊さない。

## 実装

- `api/automation/overnight_full_pdca_autonomy_orchestrator_v1.py`
- `api/scripts/overnight_full_pdca_autonomy_orchestrator_v1.sh`

## CLI

```bash
cd /opt/tenmon-ark-repo/api
python3 automation/overnight_full_pdca_autonomy_orchestrator_v1.py [--one-shot]
```

`--one-shot`: 1 サイクルで終了（検証用）。

## サイクル内ステップ（順固定）

1. `tenmon_autonomy_current_state_forensic_v1.sh`
2. `tenmon_continuous_queue_dedup_and_backpressure_v1.py`
3. `model_role_router_v1.py`（forensic の `next_best_card` 等から objective 生成）
4. `browser_ai_operator_v1.py` — **Darwin かつ** `TENMON_FULL_PDCA_SKIP_BROWSER` 未設定時のみ。それ以外は stub advice（捏造せず `not_consulted_this_cycle`）
5. `multi_model_consensus_v1.py`（gpt + claude/gemini stub）
6. `model_advice_to_patch_plan_bridge_v1.py`
7. `build_probe_rollback_autoguard_v1.py`
8. `acceptance_gated_self_commit_and_requeue_v1.py`
9. `tenmon_autonomy_result_bind_to_rejudge_and_acceptance_v1.sh`
10. `tenmon_worldclass_acceptance_scorecard_v1.py`

各サイクルの作業ディレクトリ: `api/automation/out/overnight_full_pdca_runs/cycle_<n>_<ts>/`

## lock / stop（既定・既存 daemon と分離）

| ファイル | 既定パス |
|----------|-----------|
| lock | `api/automation/.tenmon_overnight_full_pdca_orchestrator.lock` |
| stop | `api/automation/tenmon_overnight_full_pdca_stop.signal` |

上書き: `TENMON_FULL_PDCA_LOCK_FILE` / `TENMON_FULL_PDCA_STOP_FILE`

二重起動時は lock の PID が生きていれば即終了（summary に `lock_acquired: false`）。

## 出力

- `api/automation/overnight_full_pdca_summary.json` — `cycles`, `blocked_reason`, `cycle_records_tail`, `next_on_pass`
- `api/automation/overnight_full_pdca_heartbeat.json` — `cycle`, `updated_at`, `last_signals`, `last_workdir`

## 環境変数（主要）

| 変数 | 既定 | 意味 |
|------|------|------|
| `TENMON_FULL_PDCA_CYCLE_SEC` | `600` | サイクル間 sleep |
| `TENMON_FULL_PDCA_MAX_CYCLES` | `0` | 0=終了時刻まで |
| `TENMON_FULL_PDCA_END_LOCAL` | `04:00` | ローカル終了（`TENMON_FULL_PDCA_TZ`） |
| `TENMON_FULL_PDCA_SKIP_BROWSER` | 空 | `1` で browser 常時スキップ |
| `TENMON_FULL_PDCA_ROUTER_TARGET_FILES` | `api/src/routes/chat.ts` | router / stub の target_files |
| `TENMON_AUTOGUARD_*` / `TENMON_REPO_ROOT` | — | 下流スクリプトに伝播 |

## high-risk / 承認ゲート

- キュー JSON の **`state=approval_required`** 件数を `last_signals.approval_required_queue_items` に載せる（承認待ちの観測のみ）。
- **本オーケストレータはキューを自動で ready にしない**（承認ゲート維持）。safe/medium 向けの自動反復は router→stub チェーンと既存 dedup に依存。

## nextOnPass

`TENMON_DAYBREAK_REPORT_AND_NEXT_QUEUE_REARM_CURSOR_AUTO_V1`

## nextOnFail

停止。orchestrator retry 1 枚のみ。
