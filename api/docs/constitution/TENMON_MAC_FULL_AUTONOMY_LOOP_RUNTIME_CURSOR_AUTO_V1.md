# TENMON_MAC_FULL_AUTONOMY_LOOP_RUNTIME_CURSOR_AUTO_V1

## 目的

Mac 側で **1 ジョブ**について、次の最小閉路を current-run で証明する。

1. **queue poll** — `GET /api/admin/cursor/next` で ready を 1 件リース  
2. **Browser AI** — ChatGPT（`ask_chatgpt`）でカード文脈に応じた要約回答を取得  
3. **Cursor 適用** — `api/automation/**` 上のサンドボックスへ **明示的 1 パッチ**（`run_cursor_operator_proof`）  
4. **build** — `api/` で `npm run build`  
5. **VPS 返送** — `POST /api/admin/cursor/result` に `queue_id`・`touched_files`・`build_rc`・`log_snippet` を送る  

## 前提

- `TENMON_CURSOR_OPERATOR_RUNTIME_CURSOR_AUTO_V1` が PASS（`tenmon_cursor_operator_runtime_summary.json` の `cursor_operator_runtime_pass`）。

## 非交渉

- **safe_scope のみ**: 変更対象は `cursor_operator_v1` の安全パス（`api/automation/out/...` サンドボックス）のみ。
- **1 job のみ**: `next` で取得した 1 件だけ処理。
- **high-risk ファイル禁止**: `remoteCursorGuard` の `touched_files` ルールに合致するパスのみ返送。
- **fixture 成功禁止**: キュー上で `fixture: true` のジョブは **拒否**し、`release` して終了。
- **result return 必須**: 成功時は HTTP 200 で `ok: true` な応答。
- **build verify 必須**: `build_rc === 0`。
- **current-run job_id 一致**: 指示文・`log_snippet` に `queue_id` を含める。

## 環境変数

| 変数 | 説明 |
|------|------|
| `TENMON_REMOTE_CURSOR_BASE_URL` | VPS API（既定 `http://127.0.0.1:3000`） |
| `FOUNDER_KEY` | `X-Founder-Key` |
| `TENMON_REPO_ROOT` | リポジトリルート |

Browser AI / Cursor 用の既存変数（`TENMON_BROWSER_AI_*`, `TENMON_CURSOR_OPERATOR_*`）も併用する。

## 状態ファイル

- `api/automation/tenmon_mac_full_autonomy_state_v1.json` — 最終実行・成功時の `job_id` 等。

## 受け入れ（summary）

- `job_polled`
- `provider_chosen`
- `ai_answer_received`
- `cursor_apply_ok`
- `build_verify_ok`
- `result_return_ok`
- `mac_full_autonomy_loop_runtime_pass`

## NEXT

- PASS → `TENMON_MAC_AUTONOMY_24H_SAFE_GUARD_CURSOR_AUTO_V1`
- FAIL → `TENMON_MAC_FULL_AUTONOMY_LOOP_RUNTIME_RETRY_CURSOR_AUTO_V1`
