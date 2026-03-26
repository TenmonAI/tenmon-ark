# TENMON_MODEL_ADVICE_TO_CURSOR_PATCH_PLAN_BRIDGE_CURSOR_AUTO_V1

## 目的

`multi_model_consensus.json` を、**Cursor に渡せる構造化 patch plan**（JSON + MD）へ変換する。相談の自由文全文は載せず **digest・ファイル一覧・段階ステップ**に限定する。

## 実装

- `api/automation/model_advice_to_patch_plan_bridge_v1.py`
- コア: `bridge_multi_model_consensus_to_patch_plan_v1(consensus_dict)`

## CLI

```bash
python3 api/automation/model_advice_to_patch_plan_bridge_v1.py \
  --multi-model-consensus path/to/multi_model_consensus.json \
  --output-json path/to/cursor_patch_plan.json \
  --output-md path/to/cursor_patch_plan.md
```

## 入力

`multi_model_consensus_v1` の出力（少なくとも `recommended_primary_plan` / `consensus_level` / `manual_review_required` / `conflicting_changes`）。

## 出力 `cursor_patch_plan.json` 最低フィールド

| フィールド | 内容 |
|------------|------|
| `problem` | `problem_digest` 由来（短文化） |
| `target_files` | 合意プランのパス配列 |
| `change_scope` | `consensus_level` + 競合フィールド名（構造化短文） |
| `proposed_patch_steps` | verify_scope → 構造化編集（`intent_digest` のみ）→ テスト実行 |
| `risk_class` | `low` / `medium` / `high` / `unknown` |
| `tests` | 既定で **build / health / audit.build / probes** + consensus の `tests_digest` を分解した追加入力 |
| `rollback_hint` | `target_files` 向けの VCS ロールバック短文 |
| `reject_conditions` | `reject_conditions_digest` を分割したリスト |
| `approval_required` | **`risk_class == high` または consensus の `manual_review_required`** で true |
| `ok` / `fail_reason` | fail-closed 時 false と理由 |

## fail-closed

- 合意ファイルが無い / JSON 破損
- `recommended_primary_plan` が無い
- **`target_files` が空**

上記では `ok: false`・`approval_required: true`・既定 `tests` と空でない `rollback_hint` テンプレを含めても JSON/MD は生成する。

## 終了コード

`ok` が false のとき 1、true のとき 0（`approval_required` は終了コードに含めない）。

## nextOnPass

`TENMON_BUILD_PROBE_ROLLBACK_AUTOGUARD_CURSOR_AUTO_V1`

## nextOnFail

停止。patch-plan retry 1 枚のみ。
