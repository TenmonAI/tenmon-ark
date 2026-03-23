# CHAT_TRUNK_DEFINE_SPLIT_V1

## 目的

`chat.ts` から **define トランク**（出口契約・`routeReason`・response shape を変えず）を分離する。実装は `api/src/routes/chat_refactor/define_trunk_v1.ts` に集約し、`chat.ts` は import・早期分岐・`DEF_FASTPATH` 系の既存フローに接続する。

## Source of truth（監査）

- `api/automation/reports/chatts_audit_v1_report.md`
- `api/automation/reports/chatts_exit_contract_v1.json`
- `api/automation/reports/chatts_trunk_domain_map_v1.json`
- `api/automation/generated_cursor_tasks/cursor_tasks_manifest_v1.json`
- `api/automation/generated_cursor_apply/cursor_apply_manifest_v1.json`

## define トランクに含める経路（代表）

- `KOTODAMA_ONE_SOUND_GROUNDED_V4`（`reply` 入口先制）
- `SOUL_FASTPATH_VERIFIED_V1`（`res.json`）
- `KOTODAMA_ONE_SOUND_GROUNDED_V2`、`ABSTRACT_FRAME_VARIATION_V1`（`reply`）
- `DEF_FASTPATH_VERIFIED_V1` / `DEF_FASTPATH_PROPOSED_V1` 用 `buildDefineDecisionKuV1` / `persistDefineThreadCoreV1`
- `DEF_DICT_HIT` / `TENMON_SUBCONCEPT_CANON_V1` / `LANGUAGE_ESSENCE_PREEMPT_V1` 等は **未移動ブロック**は従来どおり `chat.ts`（段階的分離）

## 不変条件

- `routeReason` 文字列は既存値を維持
- `res.json` / `reply` ラッパの契約は変更しない（未ヒット時は従来フロー）
- `meaningFrame` / `responsePlan` / `threadCore` / binder の意味的互換を壊さない

## 失敗時

証拠束のみ残し、`chat.ts` を壊したまま次カードに進まない。

## 次カード

**CHAT_TRUNK_SCRIPTURE_SPLIT_V1**（カタログ上はプレースホルダー可）
