# CHAT_TRUNK_DOMAIN_MAP_V1

## 目的

`AUTO_BUILD_CHATTS_AUDIT_SUITE_V1`（`chatts_metrics_v1.analyze_chat_ts`）の静的結果を入力として、`api/src/routes/chat.ts` の **`routeReason` 群と `return` 群**を **trunk（ドメイン）単位**に束ねた domain map を JSON で出す。`chat.ts` 本体・runtime は変更しない。

## 成果物

| パス | 役割 |
|------|------|
| `api/automation/chatts_trunk_domain_map_v1.py` | マップ生成 CLI |
| `api/automation/chatts_trunk_domain_schema_v1.json` | 出力スキーマ |
| `api/automation/reports/chatts_trunk_domain_map_v1.json` | `--emit-report` 時（`.gitignore` の `reports/` 配下は未追跡） |

## Trunk（最低 6 区分）

| trunk | ざっくり意味 | 提案抽出先（参考） |
|-------|----------------|-------------------|
| `define` | 定義系・辞書・fastpath define | `chat_refactor/define.ts` 周辺 |
| `scripture` | 経典・Canon・言霊ルート | `chat_refactor/scriptureRoutes.ts` 等 |
| `general` | 上記に当てはまらない一般対話・NATURAL/R11 等 | `chat_refactor/general.ts` |
| `continuity` | スレッド継続・挨拶・KANAGI 会話など | `chat_refactor/continuity.ts` |
| `support_selfdiag` | サポート・自己診断・比較・本質問い | `chat_refactor/support_selfdiag.ts` |
| `infra_wrapper` | synapse / DB prepare / 早期ゲート・観測 | `chat_parts/wrapper_observability.ts` 等 |

分類は **`routeReason` 文字列の正規表現（順序付き）** と、直近ルートが無い **`return` 行の行テキスト** によるフォールバック。決定的だが **偽分類あり**。

## 各 trunk のフィールド

- `routeReasons` — 当該 trunk に割り当てたリテラル理由（昇順ユニーク）
- `returnCount` — 当該 trunk に割り当てた `return` 行数
- `lineRange` — 当該 trunk の return / route hit の包絡 `{ startLine, endLine }`；**ヒットゼロの trunk は `null`**
- `duplicateRisk` — 重複 `routeReason` の超過分から算出した 0–100 ヒューリスティク
- `contractRisk` — 監査 suite の missing* 候補行を trunk に割当てた件数から 0–100 ヒューリスティク
- `suggestedTargetFile` — 将来分割時の候補パス（ファイルは未作成でよい）
- `splitPriorityScore` — 監査の `splitPriority` ブロックと包絡が重なる最大スコア

## グローバル出力

- `recommendedSplitSequence` — `splitPriorityScore` 降順、同点は trunk 名昇順
- `unsafeMixedZones` — スライディング窓で **3 種以上の trunk が混在**する区間
- `wrapperCriticalZones` — synapse / `.prepare` / DB 系行が密集する区間

## 実行

```bash
python3 api/automation/chatts_trunk_domain_map_v1.py --repo-root .
python3 api/automation/chatts_trunk_domain_map_v1.py --repo-root . --stdout-json
python3 api/automation/chatts_trunk_domain_map_v1.py --repo-root . --emit-report --check-json
```

## 参考スナップショット（実装検証時・リポジトリにより変動）

- `recommendedSplitSequence`（例）: `continuity` → `define` → `general` → `scripture` → `support_selfdiag` → `infra_wrapper`
- `unsafeMixedZones` / `wrapperCriticalZones`: スライディング窓による検出件数（例: 数十件規模）

## 次カード

- **DAG / catalog**: `CHAT_TRUNK_EXIT_CONTRACT_LOCK_V1`

## 受け入れ

- `python3 -m py_compile api/automation/chatts_trunk_domain_map_v1.py`
- `python3 -m json.tool api/automation/chatts_trunk_domain_schema_v1.json`
- 上記 CLI が成功
- `cd api && npm run build`
