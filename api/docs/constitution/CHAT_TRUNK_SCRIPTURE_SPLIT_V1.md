# CHAT_TRUNK_SCRIPTURE_SPLIT_V1

## 目的

`chat.ts` から **scripture トランク**を分離する。`routeReason` / `mode` / `intent` / `ku` 形状 / exit contract を変えず、`api/src/routes/chat_refactor/scripture_trunk_v1.ts` に集約する。

## 実装範囲（本カード）

- **TRUTH_GATE より前**
  - 強制 scripture local（`SCRIPTURE_LOCAL_RESOLVER_V4` 相当の raw `res.json`）
  - `SCRIPTURE_LOCAL_RESOLVER_V4` 本文着地ブロック
- **本線**
  - `S3B_SCRIPTURE_BOUNDARY_LOCK_V1` + `TENMON_SCRIPTURE_CANON_V1` 境界ゲート（action intercept / continuity follow-up / next-step / canon + `responsePlan` / `synapseTop` / `threadCenter` persist）

## 意図的に残すもの（別カード）

- **NATURAL_GENERAL_LLM_TOP** 内の scripture center follow-up 水和（`FIX_THREAD_CONTINUITY_ROUTE_BIND_V1` 等）は **general 枝**のため本カードでは触れない。
- define 残件・continuity 本丸・support は別カード。

## Source of truth

- `api/automation/reports/chatts_audit_v1_report.md`
- `api/automation/reports/chatts_exit_contract_v1.json`
- `api/automation/reports/chatts_trunk_domain_map_v1.json`
- 生成物: `cursor_tasks_manifest_v1.json`, `cursor_apply_manifest_v1.json`, `patch_recipes_manifest_v1.json`

## 不変条件

- `routeReason` 文字列は既存値を維持（`SCRIPTURE_LOCAL_RESOLVER_V4`, `TENMON_SCRIPTURE_CANON_V1`）
- 未ヒット時は `null` を返し、呼び出し側は従来フローへフォールスルー
- `res.json(__tenmonGeneralGateResultMaybe(...))` のラッパ契約は `chat.ts` 側で維持（canon ゲートは payload のみ返却）

## 次カード

**CHAT_TRUNK_CONTINUITY_SPLIT_V1**
