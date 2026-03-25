# TENMON_CHAT_REFACTOR_PLANNER_V1

## 目的

`chat_architecture_report.json`（＋任意で improvement ledger / residual quality）から、**責務の外し先（escape）**・**低/中/高リスク帯**・**次に着手する 1〜3 主題**（`next_card_priority`）を決め、card generator に渡す。

## 成果物

| 種別 | パス |
|------|------|
| 実装 | `api/automation/chat_refactor_planner_v1.py` |
| スキーマ | `api/automation/chat_refactor_planner_schema_v1.json` |
| VPS シェル | `api/scripts/chat_refactor_planner_v1.sh` |
| 互換ラッパー | `api/automation/tenmon_chat_refactor_planner_v1.py` |

## 出力（`--out-dir`）

- `chat_refactor_plan.json` — フル計画（`escape_targets` / 各 `*_risk_targets` / `next_card_priority` / **`prioritized_items`**（generator 互換））
- `risk_partition.json` — low / medium / high のみ
- `next_card_priority.json` — 優先 1〜3 件
- `final_verdict.json` — `planner_pass`

## リスク分類（方針）

| 帯 | 例 |
|----|-----|
| **低** | surface sanitize、report/probe/verdict 整合、helper tail / generic preamble 整理 |
| **中** | route authority、longform structure、responsePlan 配線 |
| **高** | chat.ts 大規模分割、threadCore 主権変更、trunk 再編、brainstem 大改造（**自動適用禁止**） |

## 入力

- **必須:** `--architecture-report`（または `tenmon` ラッパーで `--observation-json`）
- **任意:** `--ledger-jsonl`（未指定で `improvement_ledger_entries_v1.jsonl` があれば利用）
- **任意:** `--residual-quality-json`（runner では `CHAT_REFACTOR_PLANNER_RESIDUAL_JSON` で指定可能 ※既定順序では scorer より前のため、手動 VPS での利用を想定）

## 実行例

```bash
python3 api/automation/chat_refactor_planner_v1.py \
  --architecture-report /tmp/o/chat_architecture_report.json \
  --out-dir /tmp/plan_out
```

サンプル:

```bash
python3 api/automation/chat_refactor_planner_v1.py --sample --out-dir /tmp/p
```

## 編集境界

**触らない:** `dist/**`, DB, kokuzo 正文, systemd env, **chat.ts / route / surface 実装本体**。

## カード

- `TENMON_CHAT_REFACTOR_PLANNER_CURSOR_AUTO_V1`
- `TENMON_CHAT_REFACTOR_PLANNER_VPS_V1`
- `TENMON_CHAT_REFACTOR_PLANNER_RETRY_CURSOR_AUTO_V1`
