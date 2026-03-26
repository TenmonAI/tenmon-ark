# TENMON_DAYBREAK_REPORT_AND_NEXT_QUEUE_REARM_CURSOR_AUTO_V1

## 目的

朝に **何が進んだか / 失敗したか / 承認待ちか / 次に queue へ戻す候補** を **single-source**（`daybreak_report.json` + `.md`）で出す。キュー JSON の**書き換えは行わない**（再武装は `next_queue_rearm.json` の候補のみ）。

## 実装

- `api/automation/daybreak_report_and_next_queue_rearm_v1.py`

## 入力（既定パス・環境変数で上書き可）

| 変数 | 既定 |
|------|------|
| `TENMON_DAYBREAK_OVERNIGHT_SUMMARY` | `api/automation/overnight_full_pdca_summary.json` |
| `TENMON_DAYBREAK_HEARTBEAT` | `api/automation/overnight_full_pdca_heartbeat.json` |
| `TENMON_DAYBREAK_SCORECARD` | `api/automation/tenmon_worldclass_acceptance_scorecard.json` |
| `TENMON_DAYBREAK_REMOTE_QUEUE` | `api/automation/remote_cursor_queue.json` |
| `TENMON_DAYBREAK_RESULT_BUNDLE` | `api/automation/remote_cursor_result_bundle.json` |
| `TENMON_DAYBREAK_MORNING_APPROVAL_LIST` | `api/automation/tenmon_high_risk_morning_approval_list.json` |
| `TENMON_DAYBREAK_FORENSIC` | `api/automation/tenmon_autonomy_current_state_forensic.json`（**補助観測**: `safe_next_cards` / `next_best` の補完のみ） |

`TENMON_REPO_ROOT`（既定 `/opt/tenmon-ark-repo`）配下の `api/automation` に出力する。

## 出力

- `api/automation/daybreak_report.json`
- `api/automation/daybreak_report.md`
- `api/automation/next_queue_rearm.json`

## 最低項目（report.json）

- `completed_cards`
- `failed_cards`
- `approval_required_cards`
- `next_best_card`
- `safe_next_cards`
- `manual_gate_cards`
- `queue_rearm_candidates`（`next_queue_rearm.json` にも同梱）

## ルール

- **観測と候補生成のみ** — `remote_cursor_queue.json` は変更しない（queue 契約維持）。
- **score 捏造禁止** — `worldclass_score_percent_observed` は scorecard が overnight より古い場合は載せない（`null`）。
- **stale success 禁止** — `scorecard_stale_vs_overnight` / `forensic_stale_vs_overnight`、および `last_overnight_scorecard_step_failed`（最終サイクルの scorecard ステップ `ok=false`）のときは `worldclass_score_percent_observed` / `sealed_operable_ready_observed` / `worldclass_ready_observed` を `null` にし、成功を主張しない（`integrity_notes`）。
- **失敗優先** — 同一カードが completed と failed に両方入る場合は **failed を優先**し completed から除く。

## nextOnPass

**主線13完了**

## nextOnFail

停止。daybreak retry 1 枚のみ生成。
