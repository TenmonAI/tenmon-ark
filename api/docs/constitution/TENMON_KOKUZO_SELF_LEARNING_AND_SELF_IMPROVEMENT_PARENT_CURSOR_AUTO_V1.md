# TENMON_KOKUZO_SELF_LEARNING_AND_SELF_IMPROVEMENT_PARENT_CURSOR_AUTO_V1

## Cursor カード

`TENMON_KOKUZO_SELF_LEARNING_AND_SELF_IMPROVEMENT_PARENT_CURSOR_AUTO_V1`

## Runner

| 種別 | パス |
|------|------|
| 統合 Python | `api/automation/kokuzo_learning_improvement_os_integrated_v1.py` |
| VPS シェル | `api/scripts/kokuzo_learning_improvement_os_integrated_v1.sh` |

## 必須成果物（`automation/out/tenmon_kokuzo_learning_improvement_os_v1/` 既定）

| ファイル | 内容 |
|----------|------|
| `integrated_learning_verdict.json` | learning × improvement 統合（親カード・master verdict 参照・failure_reasons） |
| `integrated_final_verdict.json` | **out_root 正規**: compose 由来 + `overall_loop_ok`（master verdict 統一後の live seal 再利用） |
| `learning_improvement_os_manifest.json` | パスレジストリ |
| `learning_steps.json` | minimum: `input_quality` / `seed_quality` / `grounding_quality` / `conversation_return` / `seal_result` + `kg_chain` |
| `next_card_dispatch.json` | 次カード・親 RETRY・`failure_reasons` |

## Read-only 前提

- `learning_quality_scorer_v1` / `seed_quality_scorer_v1` / `evidence_grounding_scorer_v1` / `conversation_learning_bridge_v1` は `_learning_reports/` に出力（会話契約非改変）。

## OK 判定（一意）

- `integrated_verdict_ok` = `learning_chain_ok` ∧ `overall_loop_ok`
- `overall_loop_ok` = `seal_rc==0` ∧ `unified_chat_ts_overall_100`（`master_verdict.json` 優先）∧ `governor.structural_ok`

## VPS マーカー

- 統合 runner: `TENMON_KOKUZO_LEARNING_OS_AND_SELF_IMPROVEMENT_INTEGRATION_VPS_V1`
- 親（憲法）: `TENMON_KOKUZO_SELF_LEARNING_AND_SELF_IMPROVEMENT_PARENT_VPS_V1`

## FAIL_NEXT

`TENMON_KOKUZO_SELF_LEARNING_AND_SELF_IMPROVEMENT_PARENT_RETRY_CURSOR_AUTO_V1`

## DO_NOT_TOUCH

`dist/**`、`chat.ts` 会話ロジック、DB 強変更、kokuzo_pages 正文、`/api/chat` 契約、systemd env（カード範囲外の変更禁止）。
