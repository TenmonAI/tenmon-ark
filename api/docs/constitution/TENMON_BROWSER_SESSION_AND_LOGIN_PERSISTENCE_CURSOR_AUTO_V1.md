# TENMON_BROWSER_SESSION_AND_LOGIN_PERSISTENCE_CURSOR_AUTO_V1

## 目的

browser AI operator が毎回ログイン詰まりで止まらないよう、**プロバイダ別のセッション registry**（profile パス・URL・ログイン観測）を固定し、未ログインは **fail-closed** で止める（成功の捏造なし）。

## 成果物

- `api/automation/browser_session_registry_v1.json` — 雛形（コミット用）
- ランタイム registry（既定）: `api/automation/out/browser_session/registry_v1.json`（初回実行で雛形から生成）
- 実装: `api/automation/browser_ai_operator_v1.py` 内の `load_session_registry_v1` / `resolve_browser_session_v1` / `_probe_session_playwright`

## provider ごとのレコード

各キー（`providers.chatgpt` 等）に最低限:

| フィールド | 意味 |
|------------|------|
| `profile_dir` | Playwright 永続コンテキスト用ユーザデータディレクトリ |
| `provider_url` | 起動・プローブ先 URL |
| `status_file` | 直近プローブ結果 JSON のパス（automation 相対または絶対） |
| `last_login_check` | 最終観測時刻（UTC ISO） |
| `session_state` | `unknown` / `session_usable` / `login_required` / `manual_required` |

## 起動時判定（Darwin + operator CLI）

1. `login_required` / `manual_required` が registry に入っている → **即 fail**（再プローブしない）
2. `session_usable` かつ `last_login_check` が TTL 内（既定 24h、`TENMON_BROWSER_SESSION_TTL_SEC`）→ **実行可**
3. それ以外 → Playwright で軽量プローブ（入力欄可視など）。結果を registry と `status_file` に書き戻し

非 Darwin ではセッションゲートをスキップ（従来どおり `darwin_only` 等は下流で判定）。

## 環境変数

| 変数 | 作用 |
|------|------|
| `TENMON_BROWSER_SESSION_REGISTRY` | ランタイム registry のパス上書き |
| `TENMON_BROWSER_SESSION_TTL_SEC` | `session_usable` の再プローブ間隔（秒） |
| `TENMON_BROWSER_SESSION_PROBE_MS` | プローブ `goto` タイムアウト（ms） |
| `TENMON_BROWSER_SESSION_ASSUME_USABLE=1` | **開発用** プローブを飛ばす（本番では非推奨） |

## operator 出力 JSON（セッション失敗時）

`login_required` / `manual_required` / `registry_path` / `profile_dir` / `session_status_file` / `session_state` 等を付与し、`ok: false`・`manual_review_required: true` で返す。

## 検証

```bash
python3 -m py_compile api/automation/browser_ai_operator_v1.py
```

## nextOnPass

`TENMON_SCREEN_OBSERVE_AND_ACTION_SELECT_CURSOR_AUTO_V1`

## nextOnFail

停止。session persistence retry 1 枚のみ。
