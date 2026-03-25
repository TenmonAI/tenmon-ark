# TENMON_KG1_DETERMINISTIC_SEED_GENERATOR_V1

## 目的

虚空蔵高速学習の第一段として、**LLM を使わず** KHS 根拠から **決定的（idempotent）な Seed 層**を生成する。同一入力・再実行で **同一件数・同一マニフェストハッシュ**を保ち、自己改善 OS や下流パイプラインと接続可能にする。

## 入力

- **`khs_passable_set.json`**（KG0）の `unitIds` のみを根拠とする。
- 既定では **`kg1_pipeline_recommended === true`** のときだけ生成する（`--no-require-pipeline` で緩和可）。
- 各 `quote` は `evaluateKokuzoBadHeuristicV1` で再検査し、**BAD は混入させない**。

## 出力 Seed（最低フィールド）

| フィールド | 内容 |
|------------|------|
| `seedId` | 正規化ペイロードの SHA-256 先頭 32 hex |
| `lawKey` | 当該 `unitId` の `khs_laws.lawKey`（昇順） |
| `termKey` | 重複排除・昇順 |
| `truth_axis` | `truthAxis` ユニークを `\|` 連結（無ければ `UNSPECIFIED`） |
| `water_fire_vector` | `waterFireClass` 群から決定的に算出（`water`/`fire` 合計 1 近傍） |
| `quoteHash` | `khs_units.quoteHash` を配列で（通常 1 要素） |
| `phaseProfile` | `schema`, `unitId`, `docNorm`, `pdfPage`, `anchorsSha256`, `quoteLen`（再結合用フィンガープリント） |

自由生成の説明文は載せない（**参照核**のみ）。

## 実装

- コア: `api/src/seed/deterministic_seed_generator_v1.ts`
- CLI: `api/src/seed/deterministic_seed_generator_run_v1.ts`（`npx tsx`）
- オーケストレーション: `api/automation/deterministic_seed_generator_v1.py`
- VPS: `api/scripts/deterministic_seed_generator_v1.sh`

## DB

- **スキーマ破壊的変更なし**。本カードは **JSON 成果物**が主。既存 `khs_seeds_det_v1` への同期は別カードでよい。

## VPS 成果物

- `TENMON_KG1_DETERMINISTIC_SEED_GENERATOR_VPS_V1`
- `khs_seeds_sample.json`
- `seed_idempotence_report.json`
- `final_verdict.json`

## 監査

環境変数 `KG1_AUDIT_URL`（例 `http://127.0.0.1:8790/api/audit`）を設定すると HTTP 200 を **追加条件**として `final_verdict` に反映。未設定時は監査はスキップ（失敗扱いにしない）。

## FAIL_NEXT

`TENMON_KG1_DETERMINISTIC_SEED_GENERATOR_RETRY_CURSOR_AUTO_V1`
