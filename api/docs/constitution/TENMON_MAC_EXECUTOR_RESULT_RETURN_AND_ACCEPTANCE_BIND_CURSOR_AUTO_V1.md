# TENMON_MAC_EXECUTOR_RESULT_RETURN_AND_ACCEPTANCE_BIND_CURSOR_AUTO_V1

## 目的

Mac executor が取得した non-fixture ジョブについて、`POST /api/admin/cursor/result` で current-run 証跡を返し、キューを `executed` に進め、バンドルに記録して acceptance / rejudge 系の後段が参照できる状態にする。

## API 契約（`POST /api/admin/cursor/result`）

Founder executor Bearer 必須。本文は JSON。lookup は **`id` → `queue_id` → `job_id`**（`adminCursorCommand` の `findQueueItem` と同一）。

### current-run executor セッション例

```json
{
  "id": "2344ae644701487c",
  "queue_id": "2344ae644701487c",
  "job_id": "2344ae644701487c",
  "status": "dry_run_started",
  "result_type": "executor_session",
  "session_id": "curs_xxx",
  "cursor_job_session_manifest": "/Users/.../cursor_job_session_manifest.json",
  "mac_executor_state": "/Users/.../mac_executor_state.json",
  "dangerous_patch_block_report": "/Users/.../dangerous_patch_block_report.json",
  "log_path": "/Users/.../cursor_session_xxx.log",
  "current_run": true
}
```

- **`current_run`: true** かつ **`result_type`: `executor_session`** かつ **`touched_files` ガード OK** のとき、**非 fixture** かつキュー状態が **`delivered`** の項目のみ **`executed`** に遷移する。
- **fixture**（`dry_run_only` / `fixture` 真）: バンドルには追記するが **`executed` にはしない**（`ready` に戻しリース解除）。
- **`executor_session` で `current_run` が真でない**: 捏造完了にしないため **`executed` にせず** `ready` に戻す（`transition`: `executor_session_missing_current_run`）。
- 従来の `build_rc` / `acceptance_ok` / `touched_files` による判定は、上記以外の payload で従来どおり。

バンドルエントリは `schema_version: 2` とし、セッション系フィールドをそのまま保持する。

## 手動 curl での注意

`curl --data-binary @~/path/file.json` は **`~` が展開されず失敗**することがある。`@"$HOME/tenmon-mac/file.json"` や絶対パスを使う。

## 自動化

- `api/automation/tenmon_mac_executor_result_return_and_acceptance_bind_v1.py` — Bearer で API に POST。要 `TENMON_EXECUTOR_BEARER_TOKEN`（固定 Bearer 依存は watch loop では使わない）。
- `api/scripts/tenmon_mac_executor_result_return_and_acceptance_bind_v1.sh` — 上記のラッパー。
- 任意: `TENMON_RUN_REJUDGE_AFTER_RESULT=1` かつ `tenmon_latest_state_rejudge_and_seal_refresh_v1.sh` が存在すると、その後に rejudge シェルを **best-effort** で実行。

## 共有キュー I/O

`adminCursorResult.ts` は `adminCursorCommand.ts` の **`readQueue` / `writeQueue` / `findQueueItem` / `isFixtureItem`** を利用し、キュー正規化（id 修復・dry_run 正規化）と lookup 契約を揃える。

## NON-NEGOTIABLES

- Bearer 認証・`/queue` / `/next` / `/release` の既存成功経路を壊さない
- success 捏造禁止、fixture を completion に使わない
- `dist/` 直編集禁止

*Version: 1*
