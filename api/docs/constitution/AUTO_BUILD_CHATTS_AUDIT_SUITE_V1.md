# AUTO_BUILD_CHATTS_AUDIT_SUITE_V1

## 目的

`api/src/routes/chat.ts` を**読み取り専用**で静的監査し、JSON と Markdown レポートを `api/automation/reports/` に出す。TypeScript の実行時挙動・`chat.ts` 本体・`client/**`・`dist/**`・`kokuzo_schema.sql` は変更しない。

## 成果物（automation）

| ファイル | 役割 |
|----------|------|
| `api/automation/chatts_metrics_v1.py` | 行カウント、import、`routeReason` 抽出、`return` サイト、ヒューリスティック欠損候補、`splitPriority` 算出 |
| `api/automation/chatts_audit_suite_v1.py` | CLI（`--stdout-json` / `--emit-reports` / `--check-json`） |
| `api/automation/chatts_audit_schema_v1.json` | レポート JSON の必須キー定義 |
| `api/automation/reports/chatts_audit_v1_report.{json,md}` | `--emit-reports` 時に生成（`.gitignore` 方針はリポジトリ運用に従う） |

## JSON フィールド（必須）

- `lineCount` / `importCount`
- `routeReasons[]` — リテラル文字列のユニーク一覧（辞書順）
- `duplicateRouteReasons[]` — `{ reason, count }`（count ≥ 2）
- `returnSites[]` — `{ line, preview }`（`//` 左側の行内 `return`）
- `missingResponsePlanCandidates[]` — `return { ... }` ブロック解析 + **±70 行ウィンドウ**のヒューリスティック（偽陽性あり）
- `missingKuCandidates[]` / `missingThreadCoreCandidates[]` / `missingSynapseTopCandidates[]` — 同様
- `splitPriority[]` — 最大 10 ブロック。スコア = 正規化された行長、return 密度、`routeReason` 密度、重複 routeReason ヒット、欠損候補ヒットの加重和（決定的）

実装は **regex + 括弧バランス（文字列・ライン/ブロックコメント考慮）** まで。AST は使わない。

## 実行方法

```bash
# 要約 JSON（既定）
python3 api/automation/chatts_audit_suite_v1.py --repo-root .

# フル JSON を stdout
python3 api/automation/chatts_audit_suite_v1.py --repo-root . --stdout-json

# レポート書き出し + 必須キー検証
python3 api/automation/chatts_audit_suite_v1.py --repo-root . --emit-reports --check-json
```

Runner / Supervisor: **`--execute-checks` かつ dry-run でない**ときだけ `postchecks` の `command` が走る。dry-run ではパッチ `none` で通過し、上記 CLI を手動で実行する想定。

## 参考スナップショット（実装検証時・リポジトリ状態により変動）

| 指標 | 値（目安） |
|------|------------|
| lineCount | 14338 |
| importCount | 104 |
| distinct routeReason リテラル | 75 |
| duplicate routeReason 種類（≥2 回） | 46 |
| return 行サイト数 | 314 |
| missingResponsePlanCandidates | 79 |
| missingKuCandidates | 0 |
| missingThreadCoreCandidates | 102 |
| missingSynapseTopCandidates | 4 |
| splitPriority 先頭ブロック（行） | 5737–7170（score 最大） |

## 次カード（DAG / catalog）

- **次**: `CHAT_TRUNK_DOMAIN_MAP_V1`
- **前段**: `CHAT_TS_COMPLEXITY_AUDIT_V1` のあとに本スイートを挿入

## 受け入れ

- `python3 -m py_compile api/automation/chatts_*.py`
- `python3 -m json.tool api/automation/chatts_audit_schema_v1.json`
- `python3 api/automation/chatts_audit_suite_v1.py --repo-root . --emit-reports --check-json`
- `cd api && npm run build`
- `chat.ts` / `client/**` / `dist/**` / `kokuzo_schema.sql` 非変更
