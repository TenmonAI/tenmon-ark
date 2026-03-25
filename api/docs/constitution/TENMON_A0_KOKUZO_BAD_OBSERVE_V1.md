# TENMON_A0_KOKUZO_BAD_OBSERVE_V1

## Cursor カード

`TENMON_A0_KOKUZO_BAD_OBSERVE_CURSOR_AUTO_V1`

## 目的

言霊秘書.pdf 等の **BAD（制御文字・置換文字・モジバケ疑い）**を **観測のみ**で固定し、**doc / pdfPage 別分布**と **ingest 前後の切り分け材料**を JSON に出す。

## 実装

| 種別 | パス |
|------|------|
| Observer | `api/automation/kokuzo_bad_observer_v1.py` |
| VPS | `api/scripts/kokuzo_bad_observer_v1.sh`（`TENMON_A0_KOKUZO_BAD_OBSERVE_VPS_V1`） |

## 読み取り

- **kokuzo_pages** — `kokuzo.sqlite` 読み取り専用（`TENMON_DATA_DIR` / `TENMON_ARK_DB_KOKUZO_PATH`）
- **ingest 中間物** — `--compare-dir`（`doc` / `pdfPage` / `text` を含む jsonl）
- **ログ** — `--log-dir`（`*ingest*.log`, `*kokuzo*.log`, `*.jsonl` のファイル名・エラー行ヒント）

## 指標（観測）

- 文字列: 長さ、和字比率、制御文字率、`\ufffd` 件数、NUL
- バイト: UTF-8 先頭 96B の **hex**（`utf8_hex_head_96b`）
- **hard_bad_signal**: 置換文字 / NUL / 制御文字率 ≥1%（**汚染率の主指標**）
- **soft_mojibake_context**: 和文期待コンテキスト向けの参考（ラテン主体ページは除外）
- **mojibake_likely**: hard OR soft（一覧用）
- **layer_guess**: 中間 jsonl と突き合わせ可能なとき  
  - DB だけ悪い → `storage_or_post_ingest_suspected`  
  - 中間も悪い → `ingest_or_extract_suspected`

## DO_NOT_TOUCH

- kokuzo_pages 正文の書き換え、ingest 本体の改修、DB schema、`chat.ts`

## VPS_VALIDATION_OUTPUTS

- `TENMON_A0_KOKUZO_BAD_OBSERVE_VPS_V1`
- `kokuzo_bad_report.json`
- `page_bad_distribution.json`
- `final_verdict.json`

## FAIL_NEXT_CARD

`TENMON_A0_KOKUZO_BAD_OBSERVE_RETRY_CURSOR_AUTO_V1`

## 実行例

```bash
KOKUZO_BAD_COMPARE_DIR=/path/to/extract_jsonl \
  python3 api/automation/kokuzo_bad_observer_v1.py --out-dir /tmp/kokuzo_bad --stdout-json
```
