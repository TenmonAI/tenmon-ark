# TENMON_CURSOR_EXECUTOR_REAL_RESULT_AND_TOUCHFILES_BIND_CURSOR_AUTO_V1

## 目的

real execution 時に `remote_cursor_result_bundle.json`（`/api/admin/cursor/result` 取り込み）へ、dry-run でない証拠と `touched_files` を残す。dry-run と real はフィールドとファイル命名で明確に分離する。

## 実装（`api/scripts/tenmon_cursor_watch_loop.sh`）

### POST payload（executor_session）

| フィールド | dry-run | real |
|------------|---------|------|
| `dry_run` | `true` | `false` |
| `real_execution_enabled` | `false` | `true` |
| `escrow_approved` | queue item 由来の boolean | 同左 |
| `queue_id` | キュー id（`id` と同値） | 同左 |
| `session_id` | `watch_dry_<ts>_<qid>` | `watch_real_<ts>_<qid>` |
| `touched_files` | 常に `[]` | `git status --porcelain -uall` の前後差分から抽出（リポジトリに変更が無ければ `[]`） |
| `status` | `dry_run_started` | `started` または `running`（`TENMON_WATCH_REAL_RESULT_STATUS`、既定 `started`） |

### ログ

- `result_post_ok` / `result_post_failed` に `queue_id`, `session_id`, `real_execution_enabled=true|false` を含める。

### 成果物パス衝突回避

- `item_*`, `executor_*`, `cursor_session_watch_*`, dry 用 stub（manifest/state/report）、`review_accept_*`, `result_*` は `dry` / `real` と `qid` をファイル名に含める。

## 受け入れ

- real 実行でワーキングツリーに変更がある場合、bundle entry に `dry_run:false`, `real_execution_enabled:true`, `touched_files` に当該パスが入る。
- dry-run entry は `touched_files:[]` のまま。
- queue / bundle の JSON が破損しない。

## nextOnPass

`TENMON_APPROVED_HIGH_RISK_REAL_RUN_GUARD_AND_AUDIT_CURSOR_AUTO_V1`

## nextOnFail

停止。result bind retry カード 1 枚のみ。
