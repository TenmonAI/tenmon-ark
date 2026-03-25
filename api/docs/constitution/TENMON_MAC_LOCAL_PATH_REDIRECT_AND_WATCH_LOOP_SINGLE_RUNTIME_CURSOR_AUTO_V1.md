# TENMON_MAC_LOCAL_PATH_REDIRECT_AND_WATCH_LOOP_SINGLE_RUNTIME_CURSOR_AUTO_V1

## 目的

Mac で result return ヘルパーが repo 配下（例 `/opt/tenmon-ark-repo/api/automation/`）に summary を書こうとして `PermissionError` になるのを防ぎ、watch loop を **refresh 取得のみ**の単一ランタイムに固定する。

## 1. `tenmon_mac_executor_result_return_and_acceptance_bind_v1.py`

- **既定**の summary 出力: `~/tenmon-mac/results/tenmon_mac_executor_result_return_summary.json`（親ディレクトリは自動作成）。
- **上書き**: 環境変数 `TENMON_MAC_RESULT_SUMMARY_PATH`（任意の絶対/ホーム相対パス）。
- **廃止**: 既定で `repo/api/automation/tenmon_mac_executor_result_return_summary.json` には書かない（VPS で repo 配下が必要なら `TENMON_MAC_RESULT_SUMMARY_PATH` を明示）。

API POST 本体・認証（`TENMON_EXECUTOR_BEARER_TOKEN` / `TENMON_FOUNDER_EXECUTOR_BEARER`）は従来どおり。

## 3. Mac 再配備（pkill -> recopy -> restart one clean loop）

```bash
cd ~/tenmon-mac
pkill -f tenmon_cursor_watch_loop.sh || true
pkill -f "caffeinate -i bash .*tenmon_cursor_watch_loop.sh" || true
sleep 2
mkdir -p ~/tenmon-mac/results

scp root@tenmon-vps-new:/opt/tenmon-ark-repo/api/scripts/tenmon_cursor_watch_loop.sh ~/tenmon-mac/
scp root@tenmon-vps-new:/opt/tenmon-ark-repo/api/automation/tenmon_mac_executor_result_return_and_acceptance_bind_v1.py ~/tenmon-mac/
chmod +x ~/tenmon-mac/tenmon_cursor_watch_loop.sh
chmod +x ~/tenmon-mac/tenmon_mac_executor_result_return_and_acceptance_bind_v1.py

export TENMON_REMOTE_CURSOR_BASE_URL="https://tenmon-ark.com"
export TENMON_MAC_RESULT_SUMMARY_PATH="$HOME/tenmon-mac/results/tenmon_mac_executor_result_return_summary.json"
export TENMON_MAC_HOME="$HOME/tenmon-mac"

TENMON_WATCH_ONE_SHOT=1 ~/tenmon-mac/tenmon_cursor_watch_loop.sh
tail -n 80 ~/tenmon-mac/logs/watch_loop.log
```

期待ログ:
- `auth_refresh_ok`
- `next_ok_item`
- `result_post_ok`

## 2. `tenmon_cursor_watch_loop.sh`

- **固定 Bearer 環境変数に依存しない**（`set -u` 下で未定義の `TENMON_FOUNDER_EXECUTOR_BEARER` を参照しない）。
- **毎ティック**先頭で次と同等:
  ```bash
  TOKEN="$("$PYTHON" "$AUTH_REFRESH" --skew-sec "$SKEW_SEC" --print-token 2>>"$MAIN_LOG" || true)"
  ```
- 空トークンならログして `sleep` へ戻る。

## NON-NEGOTIABLES

- refresh auth 前提・queue/next/result の既存成功経路を壊さない
- Mac で `/opt/tenmon-ark-repo/...` を **既定で** mkdir しない
- fixture を acceptance 成功に使わない（ループ側は release のみ）
- success 捏造禁止
- `dist/` 直編集禁止

*Version: 1*
