# TENMON_MULTI_MODEL_CONSENSUS_AND_CONFLICT_RESOLVER_CURSOR_AUTO_V1

## 目的

GPT / Claude / Gemini の相談結果（正規化 JSON）を比較し、**一致点・競合点・単一の推奨案**を1つの JSON にまとめる。生テキストは **digest のみ**（フル本文は出さない）。

## 実装

- `api/automation/multi_model_consensus_v1.py`
- コア: `build_consensus_v1(advice_gpt, advice_claude, advice_gemini)`（各 `None` 可）

## 入力 JSON（各ファイル）

次のキーを解釈（欠損は空扱い）:

| キー | 型 |
|------|-----|
| `problem` | 文字列 |
| `target_files` | 文字列配列またはカンマ区切り文字列 |
| `proposed_change` | 文字列 |
| `risk` | 文字列 |
| `tests` | 配列または文字列 |
| `reject_conditions` | 配列または文字列 |

## CLI

```bash
python3 api/automation/multi_model_consensus_v1.py \
  --advice-gpt path.json \
  --advice-claude path.json \
  --advice-gemini path.json \
  --output-file path.out.json
```

## 出力 JSON

| キー | 説明 |
|------|------|
| `consensus_level` | `full` / `partial` / `conflict` / `insufficient_input` |
| `agreed_changes` | フィールドごとの一致（2/3 または全会一致、digest のみ） |
| `conflicting_changes` | `target_files` 不一致は必ず conflict 項目 |
| `recommended_primary_plan` | **1つ**（多数派 `proposed_change` の provider を優先、tie-break: gpt→claude→gemini）。各値は digest |
| `manual_review_required` | fail-closed 時 true |

## 規則（要約）

- `proposed_change` / `problem` は正規化ハッシュで **2/3 以上一致**を agreed に載せる。
- **`target_files` の集合が一つでも食い違えば conflict**（`consensus_level` は `conflict`）。
- `proposed_change` で多数派が無い（3 割れ）→ `conflict`。
- **high-risk**（`risk` に high / critical / escrow 等）かつ **target または proposed の競合**→ `manual_review_required: true`。
- 有効 JSON が **2 未満**→ `insufficient_input`・`manual_review_required: true`・`recommended_primary_plan: null`。

## 終了コード

`manual_review_required` が true なら 1、false なら 0。

## nextOnPass

`TENMON_MODEL_ADVICE_TO_CURSOR_PATCH_PLAN_BRIDGE_CURSOR_AUTO_V1`

## nextOnFail

停止。consensus retry 1 枚のみ。
