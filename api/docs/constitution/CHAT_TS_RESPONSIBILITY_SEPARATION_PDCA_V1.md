# CHAT_TS_RESPONSIBILITY_SEPARATION_PDCA_V1

## 目的

`api/src/routes/chat.ts` の重複責務を **観測根拠に基づき** 安全に分離し、会話主線を完成領域へ近づける。機能追加ではなく **責務分離** が主目的。

## 観測根拠（唯一の外部ログ参照）

次が存在する場合、**補助根拠**として読み取る（無い場合はスクリプトが `loaded=false` を出すのみでよい）。

- `/var/log/tenmon/card_TENMON_CHAT_TS_DUPLICATE_RESPONSIBILITY_MAP_V1/*/duplicate_responsibility_map.json`
- `.../duplicate_responsibility_map.md`
- `.../summary.json`

**憶測パッチ禁止** — 上記とローカル静的レポートが矛盾する場合は観測を再取得してから着手する。

## 静的観測ツール

- `api/automation/chatts_responsibility_partition_v1.py`  
  - 責務バケットごとの **line range**、**routeReason 群**、`res.json` / `__reply` / wrapper 関与、import ヒント、`threadCore` 等トークン密度、**route family density**、`hotWindowsTop3` を JSON+MD で出力。
- `api/automation/chatts_exit_contract_lock_v1.py`  
  - `separationObservabilityV1` に **`replyDefinitionCount`**, **`origJsonBindCount`** を追加（Phase C-1 観測）。

## 責務バケット（再分類単位）

| ラベル | 含意 |
|--------|------|
| `surface_exit` | 最終表面・projector・clean frame・rewrite 既定 |
| `general_route` | NATURAL_GENERAL 周辺・general gate |
| `continuity_route` | threadCore / Center / followup / next_step |
| `define_route` | DEF_FASTPATH / subconcept / concept |
| `scripture_route` | scripture / 正典系 |
| `support_selfaware_route` | support / KANAGI / selfaware |
| `seed_synapse_memory` | seeds / synapse ログ系 |
| `learning_sideeffects` | persist / ledger / threadCenterMemory |
| `grounded_hybrid_dispatch` | GROUNDED / hybrid / kokuzo |
| `explicit_char_longform` | 長文・明示文字 |

## Non-Negotiables

- 最小 diff、`1 変更 = 1 検証`、`dist/**` 直編集禁止。
- `chat.ts` は **薄い orchestrator** へ — ロジックは **責務ごと trunk へ外出し**。
- `decisionFrame.ku` は常に object 形状。
- `routeReason` / `responsePlan` / `threadCore` 契約破壊禁止。
- GROUNDED の doc/pdfPage **捏造禁止**。
- `smoke-hybrid` threadId を LLM_CHAT に入れない。
- `kokuzo_pages.text` 自動改変禁止。
- acceptance PASS 以外封印禁止。

## 実装順（カード）

1. 観測: `chatts_responsibility_partition_v1.py` を基線化。
2. `surface_exit_trunk_v1.ts`（`cleanLlmFrameV1` 集約）— **着手済み**。
3. `general_trunk_v2.ts`（既存 `general_trunk_v1.ts` の次世代として段階移行）。
4. `continuity_trunk_v2.ts`
5. `define_trunk_v2.ts` / `scripture_trunk_v2.ts`
6. `learning_sideeffects_v1.ts`
7. exit contract / partition の閾値で Phase C 固定。

## 完了条件（再観測）

- wrapper 重複・general 過負荷・continuity 密集・seed/synapse/memory inline 密度が **低下傾向**。
- `orig_json_bind_count <= 1`、`reply_definition_count == 1` を目標（exit lock 観測で追跡）。
