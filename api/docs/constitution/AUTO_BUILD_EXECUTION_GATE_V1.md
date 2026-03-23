# AUTO_BUILD_EXECUTION_GATE_V1

## 目的

**実 PATCH 適用前**に、Cursor タスク計画・ワークスペース準備・キュー・human gate を束ねて **一括判定**する execution gate。  
**runtime は変更しない**（JSON / レポート出力のみ）。

## 入力

| 入力 | 参照先 |
|------|--------|
| Cursor task manifest | `api/automation/generated_cursor_tasks/cursor_tasks_manifest_v1.json` |
| Workspace observer レポート | `api/automation/reports/workspace_snapshot_v1.json`（無い場合は `workspace_observer_v1.build_snapshot(..., skip_api_build=True)` で live 生成） |
| Queue snapshot | `queue_store_v1.load_snapshot`（パスは環境により可変） |
| Human gate | `human_gate_store_v1.list_pending_gates()` |

オプション `--target-card` 指定時、その `targetCard` のタスクについて **カタログの `allowedPaths`** と計画パスを突き合わせ（`catalog_scope_mismatch`）。

## 出力（`decision`）

| 値 | 意味 |
|----|------|
| `executable` | 機械的チェックを通過（適用可否は別途オペレーション判断可） |
| `blocked` | キュー衝突・ワークスペース未準備・レシピ/タスク欠落など |
| `waiting_human_gate` | **pending** の human gate レコードが存在 |
| `invalid_scope` | 禁止パスが計画に含まれる、またはカタログ許可外の計画 |

`reasonCategories` および `blockedReasons`（`executable` 以外では同一タグ列、`executable` では空）に理由分類:

- `forbidden_path_in_plan`
- `queue_running_conflict`
- `gate_approval_required`
- `workspace_not_ready`
- `missing_recipe_task`
- `catalog_scope_mismatch`

## レポート

- JSON: `api/automation/reports/execution_gate_v1.json`（`--emit-report`）
- Markdown: `api/automation/reports/execution_gate_v1.md`

## ワークスペース readiness（ゲート緩和）

`workspace_snapshot_v1` の `readyForApply` が `true` なら ready。  
それ以外でも `readyViolations` が **`{api_build_skipped, git_working_tree_dirty}` の部分集合**のみなら、このゲートでは ready とみなす（observer 本体はより厳格）。

## 次カード

**AUTO_BUILD_CURSOR_APPLIER_V1** — 本 gate が `executable` のときに限り PATCH / Cursor 適用を進める。
