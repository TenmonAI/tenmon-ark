# TENMON_CURSOR_MAC_EXECUTOR_CURSOR_AUTO_V1

## 目的

Mac 受信ディレクトリの **正規化済み build job** を **Cursor 実行セッション** に変換し、`cursor_local_launch_wrapper_v1.sh` 経由で **安全に作業を開始**する（**自動 commit / deploy はしない**）。

## 安全チェック（実行前）

- `safety_flags.rejected`（normalizer）
- `edit_scope` に `dist/`・`chat.ts` 本体・`..` 等が含まれないこと
- `edit_scope` が `do_not_touch` のパスプレフィックスと衝突しないこと
- `raw_card_body_md` への危険パターン（`rm -rf`、`ALTER TABLE`、秘密っぽい代入）

ブロック時は `dangerous_patch_block_report.json` に `blocked: true` と理由が入り、セッションは `blocked`。

## ファイル

| 種別 | パス |
|------|------|
| Executor | `api/automation/cursor_mac_executor_v1.py` |
| 起動ラッパ | `api/automation/cursor_local_launch_wrapper_v1.sh` |
| セッション manifest（生成） | `cursor_job_session_manifest.json`（`--session-dir` 以下） |
| 状態 | `mac_executor_state.json` |
| ブロックレポート | `dangerous_patch_block_report.json` |
| テンプレ | `api/automation/cursor_job_session_manifest.json`（プレースホルダ） |

## 環境変数

| 変数 | 説明 |
|------|------|
| `CURSOR_EXECUTOR_DRY_RUN=1` | Cursor 実プロセスを起動しない（VPS / CI） |
| `TENMON_REPO_ROOT` | ラッパが参照（executor から設定） |

## Mac での実行例

```bash
export CURSOR_EXECUTOR_DRY_RUN=0
python3 api/automation/cursor_mac_executor_v1.py \
  --manifest ~/tenmon_remote_bridge_inbox/job_xxx.json \
  --repo-root /path/to/tenmon-ark-repo
```

## VPS 検証

```bash
bash api/src/scripts/tenmon_cursor_mac_executor_vps_v1.sh
```

成果物: `TENMON_CURSOR_MAC_EXECUTOR_VPS_V1`, `automation/out/cursor_job_session_manifest.json`, `mac_executor_state.json`, `dangerous_patch_block_report.json`

## 次工程（結果返送）

Mac 実行の戻し: `TENMON_REMOTE_BUILD_RESULT_COLLECTOR_CURSOR_AUTO_V1`（`mac_result_packager_v1.sh` / `remote_build_result_collector_v1.py`）。

## FAIL 次カード

- `TENMON_CURSOR_MAC_EXECUTOR_RETRY_CURSOR_AUTO_V1`
