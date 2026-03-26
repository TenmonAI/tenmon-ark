# TENMON_AUTONOMY_CONSTITUTION_SEAL_V1

## 目的

自律構築 OS を **release freeze** し、TENMON-ARK の **autonomy constitution**（運用憲章と観測の単一真実源）を封印する。成果未達なら seal 禁止。成功の捏造はしない。人間は override で運用のみ緩められる（**ゲートの真偽は書き換えない**）。

## 実装

- `api/automation/release_freeze_and_autonomy_constitution_seal_v1.py`

## 入力（既定パス・環数で上書き可）

| 観測 | 既定 |
|------|------|
| overnight autonomy summary | `api/automation/tenmon_continuous_self_improvement_overnight_daemon_summary.json`（無ければ `tenmon_overnight_full_autonomy_summary.json`） |
| scorecard | `api/automation/tenmon_worldclass_acceptance_scorecard.json` |
| PWA lived proof seal summary | `api/automation/pwa_worldclass_seal_summary.json` |
| self-commit | `api/automation/out/acceptance_commit_requeue/acceptance_commit_requeue_summary.json` および `api/automation/out/true_self_commit/true_self_commit_summary.json` |
| morning approval list | `api/automation/tenmon_high_risk_morning_approval_list.json` |

補助観測（ゲート用）: `tenmon_continuous_self_improvement_os_summary.json`、`tenmon_browser_ai_operator_runtime_summary.json`、`out/**/build_probe_rollback_result.json`（最新）、`tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json`、`tenmon_conversation_worldclass_mainline_selector.json`。

## 出力

- `api/automation/release_freeze_autonomy_seal_summary.json`
- `api/automation/autonomy_constitution_seal_report.md`

## ゲート（6 つすべて true のときのみ `autonomy_seal_ready`）

1. **self_improvement_loop_ready** — OS summary `continuous_pass` かつ overnight summary が存在し、かつ overnight に `last_master_pass` がある場合は `true` であること。
2. **browser_ai_consult_ready** — `browser_ai_operator_runtime_pass === true`。
3. **build_probe_rollback_ready** — `out/**/build_probe_rollback_result.json` のうち最新の `overall_pass === true`。
4. **acceptance_gated_commit_ready** — acceptance 集約または true_self の upstream で `commit_ready === true`。
5. **pwa_lived_proof_band_ok** — `pwa_worldclass_seal_summary.json` の `seal_ready === true`。
6. **worldclass_dialogue_band_ok** — dialogue loop の `outputs.worldclass_ready` かつ `outputs.sealed_operable_ready`、**かつ** scorecard の `worldclass_ready === true`（証拠の両立）。

## Freeze 記録

`release_freeze_autonomy_seal_summary.json` の `freeze_manifest` に mainline selector 参照、保護パス候補、`api/docs/constitution/TENMON_*.md` 一覧を固定化する（リポジトリ走査・記録のみ）。

## Human override

- 環境変数 `TENMON_AUTONOMY_CONSTITUTION_SEAL_HUMAN_OVERRIDE=1` — **終了コード 0** にできるが、`gates` と `autonomy_seal_ready` は evidence のまま。

## 終了コード

- `autonomy_seal_ready` または human override → **0**
- それ以外 → **1**（retry 1 枚運用）

## next

- **pass**: `MAINLINE_COMPLETED_READ_ONLY_SEAL_V1`（主線完了）
- **fail**: 停止。`TENMON_AUTONOMY_CONSTITUTION_SEAL_RETRY_CURSOR_AUTO_V1` 1 枚のみ。`api/automation/retry_cursor_card_hint.md` を参照。
