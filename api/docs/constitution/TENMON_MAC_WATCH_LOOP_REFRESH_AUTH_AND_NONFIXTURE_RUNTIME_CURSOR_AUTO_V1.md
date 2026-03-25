# TENMON_MAC_WATCH_LOOP_REFRESH_AUTH_AND_NONFIXTURE_RUNTIME_CURSOR_AUTO_V1

## 目的

Mac 上の watch loop を **refreshable Founder executor auth** 前提で常駐させ、`/queue` → `/next` →（非 fixture のみ）dry-run 証跡 → `POST /result` → `executed` まで、人手で Bearer を貼り替えずに回し続けられるようにする。

## Mac に置くファイル（例: `~/tenmon-mac/`）

| ファイル | 説明 |
|----------|------|
| `executor_auth.json` | 初回のみ founder ブラウザで `include_refresh=1` 発行し保存 |
| `tenmon_mac_executor_auth_refresh_v1.py` | リポジトリ `api/automation/` からコピー |
| `tenmon_cursor_watch_loop.sh` | リポジトリ `api/scripts/` からコピー（実行権付与） |
| `tenmon_cursor_executor.py` | 任意。第1引数に `item_<UTC>.json` のパスを渡して呼ぶ。無い場合はスタブログのみで `result` は送る |
| `tenmon_cursor_executor_stub_v1.py` | 任意。リポジトリ `api/automation/` を `tenmon_cursor_executor.py` としてコピーすれば dry-run 検証可 |
| `tenmon_mac_executor_result_return_and_acceptance_bind_v1.py` | 任意（ループは **curl で直接** `POST /result` するため必須ではない） |

## 認証（毎ティック）

ループ先頭で次と同等を実行し、**その回の** `Authorization: Bearer` に使う（固定 `export` しない）。

```bash
TOKEN="$("$HOME/tenmon-mac/.venv/bin/python" "$HOME/tenmon-mac/tenmon_mac_executor_auth_refresh_v1.py" --skew-sec 300 --print-token)"
```

環境変数で上書き可:

- `TENMON_MAC_HOME`（既定 `~/tenmon-mac`）
- `TENMON_MAC_PYTHON` / `TENMON_MAC_AUTH_REFRESH_SCRIPT`
- `TENMON_MAC_EXECUTOR_PY` / `TENMON_MAC_EXECUTOR_CMD`（後者は `bash -c` 用。`TENMON_WATCH_ITEM_JSON` にパスが入る）
- `TENMON_WATCH_AUTH_SKEW_SEC`（既定 300）
- `TENMON_REMOTE_CURSOR_BASE_URL`（**必須**）

## ループ挙動（dry-run 常駐）

1. **refresh** → token 失敗ならログして `sleep` し再試行。
2. **GET `/api/admin/cursor/queue`** → `logs/queue_<UTC>.json` に保存。
3. **GET `/api/admin/cursor/next`**（`dry_run_only` クエリなし → **API 側で non-fixture 優先**）→ `logs/next_<UTC>.json`。
4. **item なし** → ログのみ、`sleep`。
5. **`fixture == true`**（リース済み）→ **`POST /release`** のみ（**result で完了扱いにしない**）。`logs/release_fixture_<UTC>.json`。
6. **非 fixture** → `CURSOR_EXECUTOR_DRY_RUN=1` で `TENMON_MAC_EXECUTOR_CMD` または `tenmon_cursor_executor.py` があれば item JSON パスを渡して実行。無ければスタブログのみ。
7. **POST `/api/admin/cursor/result`** … `current_run: true` / `result_type: executor_session` / `status: dry_run_started`、証跡パスは **`$LOG_DIR` 配下の実在ファイル**。

## ログ

- 標準エラー＋追記: `TENMON_MAC_WATCH_LOG` または `~/tenmon-mac/logs/watch_loop.log`
- 各 API 応答・release・result: 同じ `logs/` にタイムスタンプ付き JSON

## 運用コマンド例

```bash
export TENMON_REMOTE_CURSOR_BASE_URL=https://tenmon-ark.com
export TENMON_WATCH_POLL_SEC=90
# 単発テスト
TENMON_WATCH_ONE_SHOT=1 ~/tenmon-mac/tenmon_cursor_watch_loop.sh
# 常駐
~/tenmon-mac/tenmon_cursor_watch_loop.sh
```

## 依存

- `curl`, `jq`
- Python 3（venv 推奨）

## トラブル: `curl --data-binary @...` と `~`

`@` 以降のパスは **チルダ `~` が展開されない**（zsh/bash とも、`@` 付きは curl がその文字列を開こうとするため `~/foo` が失敗しがち）。

- **悪い例:** `--data-binary @~/tenmon-mac/result_payload.json`
- **良い例:** `--data-binary @"$HOME/tenmon-mac/result_payload.json"` または絶対パス

手動 POST やループ内で JSON ファイルを渡すときは **`$HOME` またはフルパス**に統一する。

## NON-NEGOTIABLES

- refresh auth 前提・既存 queue/next/result 成功経路を壊さない
- fixture を completion 成功に使わない（release のみ）
- success 捏造禁止
- `chat.ts` / `finalize.ts` / `web/src/**` は本件で変更しない
- `dist/` 直編集禁止

*Version: 1*
