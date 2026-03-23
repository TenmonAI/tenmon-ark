# AUTO_BUILD_WORKSPACE_OBSERVER_V1

## 目的

リポジトリ／ビルド／キュー／human gate／生成物（patch recipes・Cursor tasks）／カタログ・DAG／主要レポートを **1 枚のスナップショット** で観測し、`auto-build` 実行前の **安全ゲート**（`readyForApply`）を固定する。  
**runtime サービスは変更しない**（読み取りと、オプションで `api/` に対する `npm run build` のみ）。

## 観測項目

| 区分 | 内容 |
|------|------|
| Git | `git status --porcelain`（dirty / 行数）、ブランチ |
| HEAD | `git rev-parse HEAD` |
| Queue | `queue_snapshot_v1.json` の有無、カード状態集計、`parallelPolicy` |
| single_flight | `running` カードが複数、または `parallelPolicy != single_flight` を違反とする |
| Human gate | `human_gate_store_v1.list_pending_gates()` の件数 |
| Patch recipes | `generated_patch_recipes/*.json` 件数、マニフェスト |
| Cursor tasks | `generated_cursor_tasks/*.json` 件数、マニフェスト |
| Catalog / DAG | `card_catalog_v1.json` 必須キー、`card_dependency_graph_v1.json` の DAG 妥当性 |
| API build | `cd api && npm run build`（`--skip-api-build` または `TENMON_WORKSPACE_OBSERVER_SKIP_BUILD=1` でスキップ可） |
| Reports | 監査・計画・exit contract・各マニフェスト等の存在と mtime |

## 出力

- **JSON スナップショット**（スキーマ: `api/automation/workspace_observer_schema_v1.json`）
- **Markdown レポート**: `api/automation/reports/workspace_snapshot_v1.md`
- **JSON レポート**: `api/automation/reports/workspace_snapshot_v1.json`（`--emit-report`）

## `readyForApply`

次を **すべて** 満たすとき `true`。満たさない理由は `readyViolations` に列挙する。

1. カタログ検証 OK（必須キー充足）
2. DAG 検証 OK（未知ノードなし・トポロジー OK）
3. single_flight 違反なし
4. human gate **pending が 0**
5. API build を実行した場合は **成功**（スキップ時は `api_build_skipped` で `false`）
6. Git 作業ツリーが **クリーン**（`git status` に変更なし）

## CLI

```bash
python3 api/automation/workspace_observer_v1.py --repo-root . --stdout-json
python3 api/automation/workspace_observer_v1.py --repo-root . --emit-report --check-json
```

## 次カード

**AUTO_BUILD_EXECUTION_GATE_V1** — 本スナップショットの `readyForApply` を入力として、auto-build 適用直前の最終ゲートを定義する。
