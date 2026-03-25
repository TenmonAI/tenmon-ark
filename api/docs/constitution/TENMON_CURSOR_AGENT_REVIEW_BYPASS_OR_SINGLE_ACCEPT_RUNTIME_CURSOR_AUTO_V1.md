# TENMON_CURSOR_AGENT_REVIEW_BYPASS_OR_SINGLE_ACCEPT_RUNTIME_CURSOR_AUTO_V1

## 目的

Cursor Agent が Review UI で停止する問題を、可能なら自動承認へ、不可なら single accept runtime（1 回の承認停止点）へ圧縮する。

## 追加

- `api/automation/cursor_review_acceptor_v1.py`

## 更新

- `api/scripts/tenmon_cursor_watch_loop.sh`

## 動作

### `cursor_review_acceptor_v1.py`

- Mac (`darwin`) 以外は `manual_review_required=true` を返す（偽装通過しない）。
- item JSON が high-risk（`chat.ts` / `finalize.ts` / `web/src/` / `auth` / `queue` / `token`）を含む場合、最初から `manual_review_required=true`。
- `osascript` + `System Events` でボタン探索:
  1. `Continue without reverting`
  2. `Review`
  3. `Keep All`
  4. `Accept All`
  5. `Apply All`
- `Keep All` / `Accept All` / `Apply All` のいずれかクリックで `status=accepted`。
- クリック不能・タイムアウト時は `manual_review_required=true` / `timeout=true`。

### watch loop 連携

`tenmon_cursor_watch_loop.sh` に以下を追加:

- `TENMON_REVIEW_ACCEPT_ENABLE`（既定 `1`）
- `TENMON_REVIEW_ACCEPT_TIMEOUT_SEC`（既定 `25`）
- `TENMON_MAC_REVIEW_ACCEPTOR_SCRIPT`（既定 `$TENMON_MAC_HOME/cursor_review_acceptor_v1.py`）

result POST payload に次を付与:

- `review_acceptor_status`
- `review_acceptor_output_path`
- `manual_review_required`

## 失敗時ポリシー

- 自動化不能なら `manual_review_required=true` を明示し、成功を捏造しない。
- 既存 refresh auth / queue / next / result 経路は維持。

## Mac 再配備（pkill → recopy → one clean loop）

```bash
# 1) 止める（watch loop / Cursor executor を含む場合）
pkill -f tenmon_cursor_watch_loop.sh || true
pkill -f tenmon_cursor_executor.py || true

# 2) 再配置（例: repo → ~/tenmon-mac）
cp -f /opt/tenmon-ark-repo/api/scripts/tenmon_cursor_watch_loop.sh "$HOME/tenmon-mac/tenmon_cursor_watch_loop.sh"
cp -f /opt/tenmon-ark-repo/api/automation/cursor_review_acceptor_v1.py "$HOME/tenmon-mac/cursor_review_acceptor_v1.py"
chmod +x "$HOME/tenmon-mac/tenmon_cursor_watch_loop.sh"

# 3) one clean loop（ログに auth_refresh_ok / next_ok_item / result_post を確認）
export TENMON_REMOTE_CURSOR_BASE_URL="https://<your-vps>"
TENMON_WATCH_ONE_SHOT=1 "$HOME/tenmon-mac/tenmon_cursor_watch_loop.sh"
```

*Version: 1*

