# TENMON_SCREEN_OBSERVE_AND_ACTION_SELECT_CURSOR_AUTO_V1

## 目的

Mac 画面の状態を観測し、次のクリック / 入力 / 待機などを選ぶ **screen-observe 層の骨格**。初期版は rule-based。後から vision モデルに差し替え可能な単一入口を固定する。

## 実装

- `api/automation/screen_observe_and_action_select_v1.py`
- 呼び出し: `browser_ai_operator_v1.screen_observe_decide_v1(...)` または CLI

## CLI

```bash
python3 api/automation/screen_observe_and_action_select_v1.py \
  --provider chatgpt|claude|gemini \
  --screenshot PATH \
  [--context-json PATH] \
  [--output-file PATH]
```

## 入力

- `--provider`: プロバイダ（将来のルール分岐・ログ用）
- `--screenshot`: 画像ファイルパス（存在・非ゼロサイズを検証）
- `--context-json`: 任意。ルール用メタデータ（下記）

### `context-json` 例（rule-based v1）

```json
{
  "login_gate": true,
  "screen_observe_v1": {
    "pipeline_step": "after_navigate",
    "wait_ms": 1500,
    "suggested_action": "click",
    "x": 100,
    "y": 200,
    "text": ""
  }
}
```

- `login_gate` / `screen_observe_v1.login_gate` が真 → `manual_required`（fail-closed）
- `pipeline_step`: `after_navigate` / `after_open_url` / `settle` → `wait`（`wait_ms`、上限 120s）
- `suggested_action`: 呼び出し元検証済みの提案のみ採用（`click` / `type` / `paste` / `wait` / `done`）

## 出力 JSON（コア 7 キー）

| キー | 型 | 意味 |
|------|-----|------|
| `ok` | bool | ルール上「次アクションを機械的に出せた」 |
| `action` | str | `click` / `type` / `paste` / `wait` / `done` / `manual_required` |
| `x`, `y` | int | `click` 用。不要時は 0 |
| `text` | str | `type`/`paste` の本文、または `wait` の待ち ms（文字列） |
| `reason` | str | 判定理由（デバッグ・監査） |
| `manual_review_required` | bool | 人手が必要なら必ず true |

CLI では上記に加え `card`, `provider`, `screenshot` を付与して stdout / `--output-file` に書く。

## fail-closed

- スクリーンショットなし・空ファイル・無効 provider・ログインゲート・vision 未接続でルール不一致 → `action: manual_required`, `manual_review_required: true`（成功の捏造なし）。

## 終了コード

`ok` かつ `manual_review_required` が false のとき 0、それ以外 1。

## nextOnPass

`TENMON_GPT_CLAUDE_GEMINI_ROLE_ROUTER_CURSOR_AUTO_V1`

## nextOnFail

停止。screen observe retry 1 枚のみ。
