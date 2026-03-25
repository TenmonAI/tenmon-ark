# TENMON_R1_20A_DETAILPLAN_STABILIZE_V1

## Cursor カード

`TENMON_R1_20A_DETAILPLAN_STABILIZE_CURSOR_AUTO_V1`

## 目的

P20 / HYBRID の **detailPlan 契約**を型で固定し、会話器が **常に `detailPlan` を object** で返す。

## 実装

| 種別 | パス |
|------|------|
| 契約型・正規化 | `api/src/planning/detailPlanContractP20.ts` |
| ゲート適用 | `chat.ts` の `__tenmonGeneralGateResultMaybe` 出口で `ensureDetailPlanContractP20OnGatePayloadV1` |
| 応答型 | `api/src/types/chat.ts` の `detailPlan?: DetailPlanContractP20V1` |
| VPS | `api/scripts/tenmon_r1_20a_detailplan_stabilize_v1.sh` |

## 契約（最小）

- `detailPlan` は **常に object**（欠損時は空の `createEmptyDetailPlanP20V1`）
- `chainOrder` / `warnings` / `evidenceIds` / `claims` は **配列**
- `centerClaim` は string  
- `khsCandidates` は **配列**（型のみ保証、検索ロジックは別カード）
- HYBRID 時: `detailPlan.routeReason` が空なら `ku.routeReason` を写す
- `debug.detailPlanContractR1` = `20A_V1`、HYBRID 時は `debug.detailPlanContract` = `P20_HYBRID_R1_20A_V1`

## VPS_VALIDATION_OUTPUTS

- `TENMON_R1_20A_DETAILPLAN_STABILIZE_VPS_V1`
- `p20_contract_audit.json`
- `detailplan_probe.json`
- `final_verdict.json`

## FAIL_NEXT_CARD

`TENMON_R1_20A_DETAILPLAN_STABILIZE_RETRY_CURSOR_AUTO_V1`

## DO_NOT_TOUCH

KHS/Seed の中身、DB schema、worldclass 本体、無関係な surface/route。
