# TENMON_CHAT_REFACTOR_GOVERNOR_V1

## Cursor カード名（参照）

`TENMON_CHAT_REFACTOR_GOVERNOR_CURSOR_AUTO_V1` — 本統治層の実装・検証を Cursor で行う際のカード名。

## 目的

Observer / Planner / Card Generator の成果から、**自動適用してよいか**、**提案で止めるか**、**人手承認が必要か**、**rollback が必要か**を決定する **最終安全門**。

## 実装

| 種別 | パス |
|------|------|
| Governor | `api/automation/chat_refactor_governor_v1.py` |
| Schema | `api/automation/chat_refactor_governor_schema_v1.json` |
| VPS | `api/scripts/chat_refactor_governor_v1.sh`（カード名 `TENMON_CHAT_REFACTOR_GOVERNOR_VPS_V1`） |
| 後方互換 | `tenmon_chat_refactor_governor_v1.py` → canonical へ委譲 |

## 入力

- `--observation-json` — アーキテクチャ観測
- `--plan-json` — `chat_refactor_plan.json`
- `--generator-manifest` — Card Generator のマニフェスト
- `--risk-partition-json`（任意）— 省略時は plan 内の low/medium/high ターゲット
- `--signals-json`（任意）— `build_ok`, `health_ok`, `audit_ok`, `runtime_ok`（いずれか `false` なら `rollback_required`）

## 出力（同一ディレクトリ）

| ファイル | 内容 |
|----------|------|
| `chat_refactor_governor_verdict.json` | `--out-verdict` で指定する主出力（= governance と同一 JSON） |
| `governance_verdict.json` | 統治判定の全文 |
| `next_card_dispatch.json` | FAIL 時の next カード分岐・推奨カード種別 |
| `rollback_decision.json` | rollback 要否とトリガー |
| `final_verdict.json` | seal 用サマリ（**PASS / seal_allowed のみ下流で seal**） |

## ポリシー（`policy` ブロック）

| フラグ | 意味 |
|--------|------|
| `auto_apply_allowed` | 低リスクかつシグナル正常時に true |
| `proposal_only` | 中リスク、または rollback 後の抑止 |
| `gated_apply` | 中リスク: ゲート付き適用レーンあり |
| `human_gate_required` | 高リスク / rollback / 臨界サイズ / manifest 欠落 |
| `rollback_required` | build / health / audit / runtime のいずれか失敗 |

## Card Generator 連携

- `generator-manifest` の `pairs[0].mode` が `proposal_gated` のとき **高リスク扱い**
- `recommended_card_kind`: `cursor_auto_apply` / `gated_apply` / `proposal_gated` / `human_review`

## Seal

- **`seal_allowed` が true かつ `status` が PASS のときのみ** seal してよい（それ以外は seal しない）。

## FAIL_NEXT_CARD

`TENMON_CHAT_REFACTOR_GOVERNOR_RETRY_CURSOR_AUTO_V1`

## DO_NOT_TOUCH

- `dist/**`, DB schema, kokuzo_pages 正文, systemd env  
- `chat.ts` / route / surface / worldclass report **実装本体**
