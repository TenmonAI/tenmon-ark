# AUTO_BUILD_PATCH_PLANNER_V1

## 目的

既存の automation 基盤（`card_catalog_v1.json` / `card_dependency_graph_v1.json`、任意で queue snapshot、`AUTO_BUILD_CHATTS_AUDIT_SUITE_V1` レポート、`CHAT_TRUNK_DOMAIN_MAP_V1` レポート）から、`api/src/routes/chat.ts` 周辺の改修系カードを **`parallelPolicy = single_flight`** の **patch plan（bundles + 残カード + 次に叩くべきカード）** に変換する。

本カードは **runtime 非変更**。`chat.ts` / `client/**` / `kokuzo_schema.sql` / `dist/**` は編集しない。Human gate を自動承認しない。

## スキーマ（`patch_plan_schema_v1.json`）

| フィールド | 意味 |
|------------|------|
| `generatedAt` | 生成時刻（UTC ISO） |
| `sourceAudit` | 入力監査 JSON の要約（版・行数・重複 route 件数・split 上位など） |
| `sourceTrunkMap` | 入力 trunk map の要約（推奨 split 順・zone 件数など） |
| `planVersion` | 計画スキーマ版（現在 1） |
| `parallelPolicy` | 固定 `single_flight` |
| `bundles` | 論理バンドル（下記） |
| `remainingCards` | 計画対象カードのうち queue で `completed` でないもの（queue 無しは全件） |
| `recommendedNextCard` | DAG 順で、前提が `remaining` に残っていない最初のカード（無ければ `null`） |

### `bundles[]` 各要素

- `bundleId` / `title` / `targetTrunk` / `goal`
- `cards` — **catalog / DAG に存在する名前のみ**（捏造なし）
- `targetFiles` — trunk map の `suggestedTargetFile` 等
- `riskLevel` — trunk の duplicate/contract リスクから `low|medium|high`
- `humanGateRequired` — trunk が `unsafeMixedZones` と lineRange で重なる、または bundle 内に `requiresHumanJudgement` / `human_gate` カード
- `preconditions` / `postconditions` — 運用チェックリスト
- `acceptanceProfiles` — bundle 内カードの acceptance の和集合
- `estimatedPatchScope` — allowedPaths の連結要約
- `rollbackAnchor` — 例: stash / tag コマンド文字列

## 優先順（バンドル並び）

1. `infra_wrapper`（`wrapperCriticalZones` 重なりが多い trunk はスコアブーストで前寄せ）
2. `define`
3. `scripture`
4. `continuity`
5. `support_selfdiag`（該当 catalog カードが無ければ `cards: []` 可）
6. `general`（常に末尾寄り）

**DAG 制約**は `recommendedNextCard` に優先。バンドル順は人間向けの「塊」の提示。

## 固定バンドル（最低 6）

1. **infra_wrapper** — route 重複 / wrapper dedup / ledger+synapse / tRPC / memory router / decisionFrame.ku 監査  
2. **define** — exit contract lock / response finalizer / reply path unify  
3. **scripture** — grounded integrity / scripture canon（human gate）  
4. **continuity** — hybrid route smoke  
5. **support_selfdiag** — 予約（空でも可）  
6. **general** — dist drift / clone guard / PDCA constitution  

## CLI

```bash
python3 api/automation/patch_planner_v1.py --repo-root .
python3 api/automation/patch_planner_v1.py --repo-root . --stdout-json
python3 api/automation/patch_planner_v1.py --repo-root . --emit-report --check-json
```

入力 JSON は `api/automation/reports/` に無い場合、**同リポジトリ上で** `analyze_chat_ts` / `build_domain_map` を再計算する（読み取りのみ）。

## 次カード（固定）

**`AUTO_BUILD_PATCH_GENERATOR_V1`** — 本 plan を Cursor 向け patch recipe JSON に変換する。

## 受け入れ

- `python3 -m py_compile api/automation/patch_planner_v1.py`
- `python3 -m json.tool api/automation/patch_plan_schema_v1.json`
- planner CLI（`--stdout-json` / `--emit-report --check-json`）
- `cd api && npm run build`
- `supervisor_v1.py --validate-only`
