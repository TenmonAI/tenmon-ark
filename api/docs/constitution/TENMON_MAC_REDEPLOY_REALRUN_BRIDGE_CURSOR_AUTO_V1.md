# TENMON_MAC_REDEPLOY_REALRUN_BRIDGE_CURSOR_AUTO_V1

## 目的

VPS／リポジトリ側の修正完了後、**Mac へファイルを再配備**し、**承認済み high-risk のみ real execution** となる watch loop を **caffeinate 付きで常駐再起動**するまでを、**Mac に直接触れず**（`ssh` / `scp` のみ）進めるための bridge を固定する。

## D

- 最小 diff（runbook / shell / payload / 本憲章のみ。product core 不変更）
- 成功の捏造禁止（ログ・API は観測のみ）
- 手順の詳細な補足・鮮度比較は `TENMON_MAC_RUNTIME_REDEPLOY_AND_RESTART_RUNBOOK_CURSOR_AUTO_V1.md` を参照

## 単一手順（bridge）

1. **ローカル前提**: 手元または VPS に **同一リポジトリ**の最新ツリー（`TENMON_REPO_ROOT`）があること。
2. **環境変数**（必須・例）:
   - `TENMON_MAC_SSH` — `user@mac-host`（Mac へ `ssh` / `scp` 可能）
   - `TENMON_REMOTE_CURSOR_BASE_URL` — リモート Cursor キュー API のベース URL（例 `https://…`）
   - `TENMON_REPO_ROOT` — コピー元リポジトリルート
3. **real-run 用 env**（bridge が Mac 上のプロセスに渡す）:
   - `TENMON_FORCE_DRY_RUN=0`
   - `TENMON_REAL_EXEC_REQUIRE_ESCROW_APPROVED=1`
   - `TENMON_MAC_HOME` — 未設定時は `~/tenmon-mac`（`TENMON_MAC_REMOTE_DIR` でサブディレクトリ名のみ変更可・既定 `tenmon-mac`）
   - `TENMON_MAC_RESULT_SUMMARY_PATH` — 任意（未設定なら watch 側既定に任せる）
4. **実行**:

```bash
export TENMON_MAC_SSH="user@your-mac"
export TENMON_REMOTE_CURSOR_BASE_URL="https://your-tenmon-api"
export TENMON_REPO_ROOT="/opt/tenmon-ark-repo"
export TENMON_FORCE_DRY_RUN=0
export TENMON_REAL_EXEC_REQUIRE_ESCROW_APPROVED=1
# 任意: export TENMON_MAC_HOME="/Users/you/tenmon-mac"
# 任意: export TENMON_MAC_RESULT_SUMMARY_PATH="/Users/you/tenmon-mac/logs/result_summary.json"

bash "${TENMON_REPO_ROOT}/api/scripts/tenmon_mac_runtime_redeploy_v1.sh" bridge_push
```

5. **スクリプトが行うこと**（Mac 上でリモート実行）:
   - `pkill -f tenmon_cursor_watch_loop.sh || true`
   - `scp` 済みファイルに対する `chmod +x`（watch / 本 redeploy 補助）
   - 上記 env の export
   - `nohup caffeinate -i bash ~/…/tenmon_cursor_watch_loop.sh >>…/watch_loop.log 2>&1 &`
   - **log tail**（直近 40 行）

## Payload（機械可読）

- `api/automation/tenmon_mac_redeploy_payload_v1.json` — `files_to_copy` / `required_env` / `restart_command` / `log_check_command` / `expected_real_execution_log`

## 再確認（手元コマンド）

補助スクリプトが **3 行の例**を出す:

```bash
bash "${TENMON_REPO_ROOT}/api/scripts/tenmon_mac_runtime_redeploy_v1.sh" confirm_hints
```

## next

- **nextOnPass**: `TENMON_DIALOGUE_POST_REDEPLOY_REALRUN_RECHECK_CURSOR_AUTO_V1`（実行: `python3 api/automation/tenmon_dialogue_post_redeploy_realrun_recheck_v1.py`、憲章: `api/docs/constitution/TENMON_DIALOGUE_POST_REDEPLOY_REALRUN_RECHECK_CURSOR_AUTO_V1.md`）
- **nextOnFail**: 停止。redeploy bridge retry 1 枚のみ生成。
