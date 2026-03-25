# TENMON_BROWSER_AI_OPERATOR_RUNTIME_CURSOR_AUTO_V1

## 目的

Mac 上のブラウザで **ChatGPT**（将来 Claude / Gemini 拡張可）を実運転し、**質問投入 → 回答取得**までを current-run で証明する。最初は **1 プロバイダ（ChatGPT）** で足りる。

## 前提

- `TENMON_MAC_OPERATOR_DECISION_API_BIND_CURSOR_AUTO_V1` が PASS（`tenmon_mac_operator_decision_bind_summary.json` の `mac_operator_decision_bind_pass`）。
- **ログイン済みセッション**（永続ブラウザプロファイル）を前提とする。
- **資格情報の自動入力は禁止**（ID/パスワードをスクリプトが入力しない）。

## 非交渉

- current-run **スクリーンショット証跡**（before / during / after）必須。
- **timeout 明示**（環境変数、下記）。
- **UI ドリフト**（コンポーザが見つからない等）は **fail-fast**。
- まずは **read-only** 用途（閲覧・質問・回答取得のみ）。

## 実装

| ファイル | 役割 |
|----------|------|
| `api/automation/browser_ai_operator_v1.py` | `ask_chatgpt(question)` — Playwright + 永続コンテキスト |
| `api/automation/tenmon_browser_ai_operator_runtime_v1.py` | 固定質問でランタイム証明・summary 出力 |
| `api/scripts/tenmon_browser_ai_operator_runtime_v1.sh` | ラッパー |

### 固定質問（Phase C）

既定: **「TypeScriptでシングルトンを実装してください」**  
（`TENMON_BROWSER_AI_FIXED_QUESTION` または `--question` で上書き可）

### Phase D — 成果物

- スクリーンショット: `before`（入力前） / `during`（送信直後） / `after`（応答後）
- 抽出テキスト: `api/automation/out/browser_ai_operator_runtime/answer_*.txt`

証跡ディレクトリ: `api/automation/out/browser_ai_operator_runtime/`。

## 依存

- **Python 3** + **Playwright**（`pip install playwright` のあと `playwright install chromium` または `playwright install chrome`）
- macOS（Darwin）のみ実行対象。Linux/VPS では `mac_only_required` で失敗する。

## 環境変数（timeout / 挙動）

| 変数 | 既定 | 説明 |
|------|------|------|
| `TENMON_BROWSER_AI_PAGE_LOAD_MS` | `45000` | ページ読み込み |
| `TENMON_BROWSER_AI_RESPONSE_MS` | `120000` | 新規アシスタントメッセージ待ち |
| `TENMON_BROWSER_AI_COMPOSER_WAIT_MS` | `20000` | コンポーザ検出 |
| `TENMON_BROWSER_AI_STREAM_SETTLE_SEC` | `3` | ストリーミング後の待ち |
| `TENMON_BROWSER_AI_USER_DATA_DIR` | `~/.tenmon_browser_ai_chrome_profile` | 永続プロファイル（ログイン状態） |
| `TENMON_BROWSER_AI_CHATGPT_URL` | `https://chatgpt.com` | 開く URL |
| `TENMON_BROWSER_AI_PLAYWRIGHT_CHANNEL` | （空） | 空=同梱 Chromium。`chrome` で Google Chrome を使用 |
| `TENMON_BROWSER_AI_HEADLESS` | 未設定 | `1` で headless（ChatGPT 側でブロックされ得る） |

## 受け入れ（summary）

- `provider_open_ok`
- `question_submit_ok`
- `response_detected`
- `answer_extract_ok`
- `browser_ai_operator_runtime_pass`

## NEXT

- PASS → `TENMON_CURSOR_OPERATOR_RUNTIME_CURSOR_AUTO_V1`
- FAIL → `TENMON_BROWSER_AI_OPERATOR_RUNTIME_RETRY_CURSOR_AUTO_V1`
