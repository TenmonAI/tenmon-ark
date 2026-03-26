# TENMON_BROWSER_AI_OPERATOR_MAC_RUNTIME_CURSOR_AUTO_V1

## 目的

TENMON-ARK が Mac 上でブラウザを使い、ChatGPT / Claude / Gemini への構築相談を開始する**初期実行器**（骨格）。ログイン済みを前提とし、成功の捏造はしない。

## 実装

- `api/automation/browser_ai_operator_v1.py`
- `api/scripts/browser_ai_operator_v1.sh`（ラッパー）

## CLI（固定）

```bash
python3 api/automation/browser_ai_operator_v1.py \
  --provider chatgpt|claude|gemini \
  --prompt-file PATH \
  --output-file PATH
```

## エンジン

| 値 | 動作 |
|----|------|
| `skeleton`（既定） | 各プロバイダのエントリ URL を `open`、プロンプトを `pbcopy`、可能なら AppleScript で貼り付け＋送信キー試行。**応答本文は取得しない** → `manual_review_required: true` を維持しうる。 |
| `playwright` | **ChatGPT のみ** `TENMON_BROWSER_AI_ENGINE=playwright` で既存 `ask_chatgpt`（Playwright）を使用。成功時 `captured_text` に回答を格納。 |

送信試行を省略する場合: `TENMON_BROWSER_AI_SKIP_SUBMIT=1`（クリップボードまで）。

## 出力 JSON（`--output-file` および stdout）

必須キー:

- `ok`
- `provider`
- `prompt_path`
- `output_path`
- `manual_review_required`
- `reason`

Playwright で回答取得できた場合のみ `captured_text` を追加（相談結果のファイル化）。

## fail-closed

ログイン未済・UI 不一致・タイムアウト・非 Darwin・入力ファイル不正などは `ok: false` かつ `manual_review_required: true`（捏造しない）。

## 検証

```bash
python3 -m py_compile api/automation/browser_ai_operator_v1.py
```

## nextOnPass

`TENMON_BROWSER_SESSION_AND_LOGIN_PERSISTENCE_CURSOR_AUTO_V1`

## nextOnFail

停止。browser operator retry 1 枚のみ。
