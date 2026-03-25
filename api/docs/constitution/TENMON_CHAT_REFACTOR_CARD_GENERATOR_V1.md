# TENMON_CHAT_REFACTOR_CARD_GENERATOR_V1

## 目的

Chat Refactor Planner の出力（`chat_refactor_plan.json` / `risk_partition.json` / 最新 `final_verdict.json`）から、**Cursor 完全自動構築カード**と **VPS 実行カード（`.sh`）**を **対で**自動生成する。

## 入力

| 入力 | 説明 |
|------|------|
| `chat_refactor_plan.json` | Planner 主出力 |
| `risk_partition.json` | 省略時は plan 内の low/medium/high ターゲットから合成 |
| `final_verdict.json` 等 | 任意。Cursor カードの「直近 verdict 要約」に反映 |

## 出力

| 出力先 | 内容 |
|--------|------|
| `api/automation/generated_cursor_apply/*.md` | テーマごとの Cursor カード（最大 3） |
| `api/automation/generated_vps_cards/<ts>/*.sh` | 同伴 VPS シェル（build / restart / health / audit / probe / verdict） |
| 同上 | `generated_cursor_card_sample.md`, `generated_vps_card_sample.sh`, `card_manifest.json`, `final_verdict.json` |

## ポリシー

- **1 カード 1 主題**（`prioritized_items` または `next_card_priority` の先頭から最大 3 件）
- **low / medium**: `*_CURSOR_AUTO_V1` + `*_VPS_V1.sh`（通常レーン）
- **high**: `*_PROPOSAL_GATED_*` — 自動適用ではなく **提案・ゲート** 文言と VPS 側 `TENMON_PROPOSAL_GATED` フック

## Cursor カード必須セクション

`CARD_NAME`, `OBJECTIVE`, `WHY_NOW`, `EDIT_SCOPE`, `DO_NOT_TOUCH`, `IMPLEMENTATION_POLICY`, `ACCEPTANCE`, `VPS_VALIDATION_OUTPUTS`, `FAIL_NEXT_CARD`

## FAIL_NEXT_CARD

`TENMON_CHAT_REFACTOR_CARD_GENERATOR_RETRY_CURSOR_AUTO_V1`

## VPS 検証カード

- スクリプト: `api/scripts/chat_refactor_card_generator_v1.sh`
- カード名: `TENMON_CHAT_REFACTOR_CARD_GENERATOR_VPS_V1`
- サンプル実行: 環境変数 `CHAT_REFACTOR_CARD_GEN_SAMPLE=1`

## 実装

- `api/automation/chat_refactor_card_generator_v1.py`
- `api/automation/chat_refactor_card_generator_schema_v1.json`
- 後方互換: `tenmon_chat_refactor_card_generator_v1.py` は canonical へ委譲

## DO_NOT_TOUCH（生成カードが尊重すべき境界）

- `dist/**`, DB schema, kokuzo_pages 正文, systemd env
- `chat.ts` 本体・route / surface / planner **実装本体**の無差別変更
