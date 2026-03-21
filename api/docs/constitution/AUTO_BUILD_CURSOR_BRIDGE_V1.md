# AUTO_BUILD_CURSOR_BRIDGE_V1

## 目的

`patch_generator_v1.py` が生成した `patch_recipes_manifest_v1.json`（および各 `recipe_*.json` と同等の内容）を読み、**Cursor がそのまま実行できる task bundle**（`task_<bundleId>.json`）とマニフェストへ変換する橋。**runtime 非変更**。`chat.ts` / `client/**` / `dist/**` / `kokuzo_schema.sql` は触らない。

## 入出力

| 入力 | 出力 |
|------|------|
| `api/automation/generated_patch_recipes/patch_recipes_manifest_v1.json`（無ければ `build_recipes` で再計算） | `api/automation/generated_cursor_tasks/cursor_tasks_manifest_v1.json` |
| 同上の `recipes[]` | `api/automation/generated_cursor_tasks/task_<bundleId>.json`（バンドルごと） |
| — | `api/automation/generated_cursor_tasks/cursor_bridge_v1_report.md` |

生成物ディレクトリは `.gitignore` でコミット対象外。

## Task JSON 必須フィールド

- `taskId` — 一意 ID（`cursor_task_<bundleId>_<idx>`）
- `bundleId` / `targetCard`
- `targetPaths` — recipe の `targetFiles` と同値
- `allowedPaths` — 許可パス（v1 では `targetPaths` と同列）
- `forbiddenPaths` — recipe の `forbiddenFiles`
- `instruction` — **固定の自然文テンプレ** + recipe の `cursorInstruction` 本文
- `prechecks` / `postchecks` — 可能なら catalog の `targetCard` の pre/postchecks、なければ checklist 由来のノート
- `humanGateRequired` / `unsafeMixedZonesHit` / `splitPriorityScore` / `nextCardOnPass` — recipe からそのまま保持

## 方針

- **single_flight** — マニフェストに `parallelPolicy: single_flight` を記載し、instruction にも明記
- Human gate — **自動承認しない**旨を instruction に含める
- 次カード — recipe の `nextCardOnPass` を維持

## CLI

```bash
python3 api/automation/cursor_bridge_v1.py --repo-root .
python3 api/automation/cursor_bridge_v1.py --repo-root . --stdout-json
python3 api/automation/cursor_bridge_v1.py --repo-root . --emit-report --check-json
```

## DAG / catalog

- `AUTO_BUILD_PATCH_GENERATOR_V1` → **本カード** → `CHAT_TRUNK_EXIT_CONTRACT_LOCK_V1`

## 次カード候補（拡張）

**`AUTO_BUILD_WORKSPACE_OBSERVER_V1`** — ワークスペース観測を自動化する（未実装時は本橋の直後で `CHAT_TRUNK_EXIT_CONTRACT_LOCK_V1` を実行）。

## 受け入れ

- `py_compile` / `json.tool` / 上記 CLI / `npm run build` / `supervisor --validate-only`
- **6** バンドル分の task が生成されること（planner の bundle 数と一致）
