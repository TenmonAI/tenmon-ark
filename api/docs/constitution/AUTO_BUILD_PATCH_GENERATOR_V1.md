# AUTO_BUILD_PATCH_GENERATOR_V1

## 目的

`AUTO_BUILD_PATCH_PLANNER_V1` の出力（`api/automation/reports/patch_plan_v1_report.json` または同場再計算）を、**Cursor がそのまま使える patch recipe**（バンドル単位 JSON + マニフェスト）へ変換する。`parallelPolicy = single_flight` を前提とする。

**禁止**: `api/src/routes/chat.ts` 直接編集、`client/**`、`api/src/db/kokuzo_schema.sql`、`dist/**`（recipe の `forbiddenFiles` に明示）。Human gate の自動承認は行わない。

## 成果物

| パス | 内容 |
|------|------|
| `api/automation/patch_generator_v1.py` | ジェネレータ CLI |
| `api/automation/patch_generator_schema_v1.json` | マニフェスト / recipe の検証用スキーマ |
| `api/automation/generated_patch_recipes/patch_recipes_manifest_v1.json` | 全 recipe 一覧（`--emit-report`） |
| `api/automation/generated_patch_recipes/recipe_<bundleId>.json` | バンドルごとの recipe |
| `api/automation/generated_patch_recipes/patch_generator_v1_report.md` | 要約 MD |

`generated_patch_recipes/` 下の生成物は `.gitignore` でコミット対象外（ディレクトリのみ追跡）。

## Recipe 必須フィールド

- `bundleName` — planner の bundle タイトル
- `targetCard` — 当バンドル内 DAG トポ順の**先頭**カード（空バンドルは空文字）
- `targetFiles` — trunk `suggestedTargetFile` + バンドル内カードの `allowedPaths`
- `forbiddenFiles` — 標準禁止 + 各カードの `forbiddenPaths` の和集合
- `patchIntent` — `goal` + planner 文脈 + **unsafeMixedZones 重なり**・**splitPriorityScore** の注記
- `patchStrategy` — バンドル内カードの `patchStrategy.mode` 連結
- `acceptanceChecklist` — acceptance / command pre/postchecks の列挙
- `humanGateRequired` — planner bundle の値
- `cursorInstruction` — 上記をまとめた Cursor 向けマークダウン
- `nextCardOnPass` — バンドル内 2 番目のカード、無ければ catalog `nextOnPass`、無ければ次バンドル先頭、最後は `CHAT_TRUNK_EXIT_CONTRACT_LOCK_V1`

追加メタ: `unsafeMixedZonesHit`, `splitPriorityScore`, `parallelPolicy`, `bundleCardsInOrder`

## CLI

```bash
python3 api/automation/patch_generator_v1.py --repo-root .
python3 api/automation/patch_generator_v1.py --repo-root . --stdout-json
python3 api/automation/patch_generator_v1.py --repo-root . --emit-report --check-json
```

プランレポートが無い場合は `patch_planner_v1.build_plan` で再生成する。

## DAG / catalog

- `AUTO_BUILD_PATCH_PLANNER_V1` → **本カード** → `CHAT_TRUNK_EXIT_CONTRACT_LOCK_V1`
- 本カードの `nextOnPass` は **`CHAT_TRUNK_EXIT_CONTRACT_LOCK_V1`**

## 受け入れ

- `python3 -m py_compile api/automation/patch_generator_v1.py`
- `python3 -m json.tool api/automation/patch_generator_schema_v1.json`
- 上記 CLI
- `cd api && npm run build`
- `supervisor_v1.py --validate-only`

## 次の作業カード（実行側）

**`CHAT_TRUNK_EXIT_CONTRACT_LOCK_V1`** — recipe に従い `chat_refactor/**` の exit contract を先に固定してから後続カードへ。
