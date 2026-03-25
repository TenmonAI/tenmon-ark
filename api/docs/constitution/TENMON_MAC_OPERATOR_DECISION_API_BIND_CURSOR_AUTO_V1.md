# TENMON_MAC_OPERATOR_DECISION_API_BIND_CURSOR_AUTO_V1

## 目的

Mac 側で取得したスクリーンショットを VPS の判断 API に送り、OpenAI Vision（または Gemini Vision）で **次の操作のみ**を固定 JSON で返す。

## 前提

- `TENMON_MAC_SCREEN_OPERATOR_RUNTIME_CURSOR_AUTO_V1` が PASS していること（`tenmon_mac_screen_operator_runtime_summary.json` の `mac_screen_operator_runtime_pass`）。

## API

- **POST** `/api/admin/mac/decision`
- **認証**: founder（Cookie `tenmon_founder=1` または `X-Founder-Key`）。未認証は **403**。

### Request body（JSON）

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `screenshot` | string | はい | PNG/JPEG 等の **base64**、または `data:image/...;base64,...` |
| `job_id` | string | はい | ジョブ識別子 |
| `context` | string | いいえ | 追加文脈 |

### Response 200（JSON のみ・自由文なし）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `action` | string | `click` \| `type` \| `paste` \| `wait` \| `done` \| `fail` |
| `x` | number \| null | `click` 時は必須（有限数値） |
| `y` | number \| null | 同上 |
| `text` | string | `type` / `paste` 時は必須（非空） |
| `reason` | string | 必須（短い理由） |

### エラー

- 入力不正: **400** `{ ok: false, error: "BAD_INPUT", detail: ... }`
- Vision 未設定: **503** `VISION_UNAVAILABLE`（`OPENAI_API_KEY` または `GEMINI_API_KEY` が無い）
- モデル出力が JSON でない / 契約違反: **502**（fail-fast）

## スクリーンショット raw 保存ポリシー

- **既定**: ディスクには保存しない（リクエスト処理中のメモリのみ）。
- **デバッグ**: `TENMON_MAC_DECISION_SCREENSHOT_DEBUG_DIR` を設定した場合のみ `{dir}/{job_id}_{timestamp}_{rand}.png` に保存。画面に PII が含まれ得るため、**運用で保持期間を定め、期限後に削除**すること。

## 環境変数

| 変数 | 説明 |
|------|------|
| `OPENAI_API_KEY` | Vision 優先（Chat Completions + `response_format: json_object`） |
| `OPENAI_MODEL` / `TENMON_MAC_DECISION_OPENAI_MODEL` | OpenAI モデル（既定 `gpt-4o`） |
| `GEMINI_API_KEY` | OpenAI が無い場合のフォールバック |
| `TENMON_MAC_DECISION_GEMINI_MODEL` | 既定 `gemini-1.5-flash` |
| `TENMON_MAC_DECISION_MAX_IMAGE_BYTES` | 最大バイト数（既定 20MiB） |

## 受け入れ（自動証明）

`api/automation/tenmon_mac_operator_decision_bind_v1.py` が `tenmon_mac_operator_decision_bind_summary.json` を出力する。

## NEXT

- PASS → `TENMON_BROWSER_AI_OPERATOR_RUNTIME_CURSOR_AUTO_V1`
- FAIL → `TENMON_MAC_OPERATOR_DECISION_API_BIND_RETRY_CURSOR_AUTO_V1`
