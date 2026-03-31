# TENMON 実行能力監査レポート（憶測禁止・fail-closed）

固定 JSON: `execution_capability_audit_report_v1.json`（機械可読・差分監査用）。本書は人間向け要約。

## 1. 「実接続」と呼ぶ最小証拠

| 領域 | 必須証拠（例） |
|------|----------------|
| Orchestra（GPT） | 証拠ディレクトリに `openai_audit_summary.json` の `http_called: true` かつ `ok: true`；`orchestra_dry_run: false` が progress に残ること |
| API キー未設定 | `reason: OPENAI_API_KEY_missing` で **明確 FAIL**（exit 2） |
| Cursor bridge | `cursor_bridge_submit_audit.json` に `submit_http_attempted: true` と HTTP ステータス；ゲート拒否時は `submit_http_attempted: false` と `blocklist_hits` |
| Admin submit | VPS 上では **JSON キュー追記のみ**。IDE 起動は **このルート内に無い**（`adminCursorCommand.ts` 先頭コメント参照） |

**禁止**: 上記の監査束なしで「実接続済み」「完全自動化」と書くこと。

## 2. Orchestra（`multi_ai_orchestra_executor_v1.py`）

- **既定**: `--dry-run` 相当（実 HTTP なし、決定的スタブ）。
- **GPT 実呼び出し**: CLI **`--no-dry-run`** のときのみ `multi_ai_orchestra_executor_v1.call_openai_real` が `https://api.openai.com/v1/chat/completions` へ POST。証拠は **`gpt_real_response.json`**。先頭で `tenmon_env_loader_v1` が `/etc/tenmon/llm.env` を読む。
- **Claude / Gemini**: 本変更では **実 HTTP 未着手**（スタブ → normalizer のみ）。
- **環境変数**: `OPENAI_API_KEY`（必須）、任意 `TENMON_OPENAI_ORCHESTRA_MODEL`。

## 3. Cursor bridge（`cursor_executor_bridge_v1.py`）

- **実送信**: `TENMON_CURSOR_BRIDGE_ENABLED=1` かつ bearer、または file enqueue モードでキューへ書き込み。
- **監査**: 各実行の `cursor_bridge_submit_audit.json`（ゲート理由・blocklist 構造化・HTTP 試行フラグ）。
- **canon 系**: `正典` / `正文` は **`canon_jp_literal` カテゴリ**で記録。無差別解除はしない。

## 4. Admin `/api/admin/cursor/submit`

- **実装**: `api/src/routes/adminCursorCommand.ts` — `guardRemoteCursorPayload` 後に `remote_cursor_queue.json` へ append。
- **未実装ではない**: キュー投入は実装済み。**Mac 上の Cursor 本体操作はこの TS ファイルには存在しない**（エージェント pull 後の別プロセス）。

## 5. systemd / EnvironmentFile

- API の例: `EnvironmentFile=` で `.env` に `OPENAI_API_KEY` 等を供給。
- Orchestra は **python 子プロセス**のため、supervisor/cron から起動する場合は **同じ環境**にキーを渡すこと。

## 6. 次カード（実装チケット）

1. `TENMON_OPENAI_REAL_CALL_BIND_CURSOR_AUTO_V1.md`
2. `TENMON_CURSOR_SUBMIT_ROUTE_TRACE_AND_REMOTE_EXEC_BIND_CURSOR_AUTO_V1.md`
