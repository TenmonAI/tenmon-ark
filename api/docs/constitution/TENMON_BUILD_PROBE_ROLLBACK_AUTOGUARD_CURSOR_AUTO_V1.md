# TENMON_BUILD_PROBE_ROLLBACK_AUTOGUARD_CURSOR_AUTO_V1

## 目的

実施工後に **build →（任意）restart → `/api/health` → `/api/audit.build` → 追加 probes** を固定順で実行し、**FAIL なら touched 限定の `git restore` と証跡保存**を行う。成功の捏造はしない（`acceptance_pass` は全ステップ成功時のみ true）。

## 実装

- `api/automation/build_probe_rollback_autoguard_v1.py`
- `api/scripts/build_probe_rollback_autoguard_v1.sh`

## CLI

```bash
python3 api/automation/build_probe_rollback_autoguard_v1.py \
  --patch-plan path/to/cursor_patch_plan.json \
  --touched-files path/to/touched.json \
  [--touched-json '[\"api/src/foo.ts\"]'] \
  [--output-dir path]
```

`touched-files`: JSON 配列、または `{"touched_files":[]}` 形式。

## 実行順

1. **git snapshot** — `git status --porcelain -uall` / `git diff --stat` を evidence に保存  
2. **build** — 既定 `cd api && npm run check`（`TENMON_AUTOGUARD_BUILD_CMD` で上書き、cwd は常に `repo/api`）  
3. **restart** — `TENMON_AUTOGUARD_RESTART_CMD` が無ければ **skipped**（成功扱い）  
4. **`GET /api/health`** — `ok: true` かつ HTTP 200  
5. **`GET /api/audit.build`** — 同上  
6. **probes** — `cursor_patch_plan.json` の `probe_urls` 配列、なければ `TENMON_AUTOGUARD_EXTRA_PROBES`（カンマ区切り）、それも無ければ **`GET /api/audit`**（JSON `ok: true`）

## ロールバック

- **repo 外・`dist` 配下パスは対象外**（直編集禁止の方針）  
- 追跡ファイル: `git restore --source=HEAD --staged --worktree -- <path>`  
- 未追跡: **削除はしない**（`paths_untracked_skipped` に記録）

FAIL 時は evidence ディレクトリに build ログ・HTTP 応答・rollback 後 `git status` を残す。

## 出力（既定 `--output-dir`）

- `build_probe_rollback_result.json` — `overall_pass`, `acceptance_pass`, `rollback_executed`, `steps[]`, `evidence_dir`, `fail_reason`  
- `rollback_report.json` — `rollback_executed`, `paths_restored` / `failed` / `untracked_skipped`

## 環境変数

| 変数 | 既定 | 意味 |
|------|------|------|
| `TENMON_REPO_ROOT` | `/opt/tenmon-ark-repo` | リポジトリルート |
| `TENMON_AUTOGUARD_API_BASE` | `http://127.0.0.1:3000` | API ベース URL |
| `TENMON_AUTOGUARD_BUILD_CMD` | `npm run check` | api ディレクトリで実行 |
| `TENMON_AUTOGUARD_BUILD_TIMEOUT_SEC` | `600` | |
| `TENMON_AUTOGUARD_RESTART_CMD` | 空 | 任意 |
| `TENMON_AUTOGUARD_EXTRA_PROBES` | 空 | 追加 GET URL |
| `TENMON_AUTOGUARD_POST_RESTART_SLEEP_SEC` | `2` | |

## ゲート

- `cursor_patch_plan.json` の **`ok` が false** → 以降は実行せず失敗（rollback なし）  
- **安全な `touched_files` が空** → 失敗（rollback なし）

## 終了コード

`overall_pass` が true のとき 0、それ以外 1。

## nextOnPass

`TENMON_ACCEPTANCE_GATED_SELF_COMMIT_AND_REQUEUE_CURSOR_AUTO_V1`

## nextOnFail

停止。rollback retry 1 枚のみ。
