# AUTO_BUILD_CURSOR_APPLIER_V1

## 目的

`generated_cursor_tasks` の **task 定義**と **execution gate 結果**を入力に、Cursor への貼り付け用 **apply コマンドバンドル**と **apply JSON** を生成する。  
**実 PATCH や runtime 変更は行わない**（生成物のみ）。

## 入力

| 入力 | パス（既定） |
|------|----------------|
| Cursor task manifest | `api/automation/generated_cursor_tasks/cursor_tasks_manifest_v1.json` |
| Execution gate レポート | `api/automation/reports/execution_gate_v1.json`（無ければ `execution_gate_v1.evaluate_gate` で live 計算） |

## 出力（`api/automation/generated_cursor_apply/`）

| 出力 | 説明 |
|------|------|
| `apply_<taskId>.json` | 1 タスク = 1 ファイル（`taskId` をファイル名に使用） |
| `cursor_apply_manifest_v1.json` | 生成した apply 一覧・ゲート要約 |
| `cursor_apply_command_bundle_v1.txt` | Cursor にそのまま貼る用のテキスト（全タスク分を連結） |

各 `apply_*.json` / テキストバンドルに含める項目:

- `targetPaths` / `allowedPaths` / `forbiddenPaths`
- `instruction`
- `prechecks` / `postchecks`
- `passCondition`（カタログの `acceptanceProfile` 等から要約）
- `nextCard`（タスクの `nextCardOnPass`）

`gateAllowsApply` は execution gate の `decision == executable` のとき `true`。`false` でもバンドルは生成し、テキスト先頭で **適用しない旨**を明示する。

## CLI

```bash
python3 api/automation/cursor_applier_v1.py --repo-root . --stdout-json
python3 api/automation/cursor_applier_v1.py --repo-root . --emit-report --check-json
```

## 次カード

**AUTO_BUILD_REPLAY_AUDIT_V1** — 適用結果の再現性・差分の監査（本カードは適用前の束ねのみ）。
