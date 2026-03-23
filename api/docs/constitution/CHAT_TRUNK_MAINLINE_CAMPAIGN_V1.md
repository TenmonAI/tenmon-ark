# CHAT_TRUNK_MAINLINE_CAMPAIGN_V1

主線 6 カード（scripture / continuity / support_selfdiag / general / infra_wrapper / runtime acceptance）を **single_flight・1 変更=1 検証** で進めるキャンペーン定義。

## 実装ファイル（`chat_refactor`）

| カード | モジュール | 備考 |
|--------|------------|------|
| SCRIPTURE_SPLIT | `scripture_trunk_v1.ts` | 早期 local / canon ゲート + **general 経路 scripture follow-up 再水和** |
| CONTINUITY_SPLIT | `continuity_trunk_v1.ts` | R22_NEXTSTEP / ESSENCE / COMPARE_FOLLOWUP / CONTINUITY_ANCHOR |
| SUPPORT_SELFDIAG_SPLIT | `support_selfdiag_trunk_v1.ts` | brainstem `support` / `selfaware` 早期分岐（第1段） |
| GENERAL_SPLIT | `general_trunk_v1.ts` | grounding→`TENMON_SCRIPTURE_CANON_V1` bump 等（第1段） |
| INFRA_WRAPPER_SPLIT | `infra_wrapper_trunk_v1.ts` | threadCore mirror ヘルパ（第1段・未全接続） |
| RUNTIME_ACCEPTANCE_LOCK | `CHAT_TRUNK_RUNTIME_ACCEPTANCE_LOCK_V1.md` | 観測・replay・gate 収束の記録 |

## 未完了（次イテレーション）

- NATURAL_GENERAL_LLM_TOP **本文・projector・shrink 本体**の `general_trunk` への大移動
- `infra_wrapper` の `__tenmonGeneralGateResultMaybe` 集約・`__applyBrainstemContractToKuV1` の移管
- カタログ未登録カードに対する `replay_audit --card` の **catalogFound 補正**

## 証拠束（標準）

- `api/automation/reports/workspace_snapshot_v1.json`
- `api/automation/reports/replay_audit_v1.json`
- `api/automation/reports/execution_gate_v1.json`
- `api/automation/reports/chatts_trunk_domain_map_v1.json`
- `api/automation/reports/chatts_exit_contract_v1.json`
