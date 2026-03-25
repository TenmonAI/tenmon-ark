# TENMON_KG0_KHS_HEALTH_GATE_V1

## 目的

KHS（`khs_units`）を学習・下流（KG1）へ渡す**前**に、入力品質を監査する。**速さより入力品質**を優先し、濁った根拠や実在性不明の行をパイプラインから切り離す。

## スコープ

- **監査のみ**（`kokuzo_pages` / `khs_units` の読取り専用）
- **DB スキーマの破壊的変更は行わない**
- 実装本体: `api/automation/khs_health_gate_v1.py`
- 実行: `api/scripts/khs_health_gate_v1.sh`

## 算出メトリクス

| 指標 | 意味 |
|------|------|
| NULL 率 | `pdfPage` が NULL の割合、空 `quote` / 空 `doc` の割合 |
| BAD 率 | `quote` テキストに対する **hard_bad**（`kokuzo_bad_observer_v1` と同定義: U+FFFD / NUL / 制御文字率 ≥ 1%） |
| 実在率 | `doc` かつ `pdfPage` がある行について、`kokuzo_pages` に対応行が存在する割合 |
| 引用可能率 | 実在ページがある行について、正規化 whitespace 後の `quote` がページ本文に部分文字列として含まれる割合 |
| quoteHash 整合率 | `quoteHash` が `SHA-256(quote UTF-8)` と一致する割合 |

## FAIL 条件（集約ゲート）

しきい値は環境変数で上書き可能（既定はスクリプト内 `_load_thresholds` 参照）。次を**すべて**満たさない場合 `aggregate_gate_pass: false`：

- `khs_units` が 1 件以上ある（0 件はデータなし FAIL）
- `null_pdf_page_rate` ≤ `KG0_MAX_NULL_PDF_PAGE_RATE`（既定 0.05）
- `quote_empty_rate` ≤ `KG0_MAX_QUOTE_EMPTY_RATE`（既定 0.01）
- `doc_empty_rate` ≤ `KG0_MAX_DOC_EMPTY_RATE`（既定 0）
- `bad_quote_rate` ≤ `KG0_MAX_BAD_QUOTE_RATE`（既定 0.02）
- `quote_hash_mismatch_rate` ≤ `KG0_MAX_QUOTE_HASH_MISMATCH_RATE`（既定 0.05）
- `kokuzo_page_exist_rate` ≥ `KG0_MIN_PAGE_EXIST_RATE`（既定 0.90、対象は doc+pdfPage あり行）
- `quotability_rate` ≥ `KG0_MIN_QUOTABILITY_RATE`（既定 0.85、対象は実在ページあり行）
- `passable_fraction` ≥ `KG0_MIN_PASSABLE_FRACTION`（既定 0.80、行レベル全合格の割合）

`kokuzo_pages` が無い場合は実在率・引用率を検証できず **FAIL**。

## 行レベル PASS 集合

次を**すべて**満たす `unitId` のみ `khs_passable_set.json` の `unitIds` に載せる：

- 非空 `doc` / 非 NULL `pdfPage` / 非空 `quote` / 非空で整合する `quoteHash`
- `quote` に hard_bad がない
- `kokuzo_pages` に `(doc, pdfPage)` が存在し、正規化 `quote` が本文に含まれる

## KG1 への進め方

- **`kg1_pipeline_recommended: true`**（= 集約ゲート PASS かつ DB エラーなし）のときのみ、学習パイプラインを起動することを推奨。
- 下流処理は **`khs_passable_set.json` の `unitIds` のみ**を根拠集合として扱う（PASS 集合以外は参照しない）。

## VPS 成果物

- `TENMON_KG0_KHS_HEALTH_GATE_VPS_V1`（マーカー）
- `khs_health_gate_report.json`
- `khs_passable_set.json`
- `final_verdict.json`

## 失敗時の次カード

`TENMON_KG0_KHS_HEALTH_GATE_RETRY_CURSOR_AUTO_V1`
