# TENMON_BROWSER_VISION_ASSISTED_OPERATOR_CURSOR_AUTO_V1

## 目的

Mac browser operator を、URL open / paste だけでなく **画面観測と action 選択**（vision-assisted 骨格）へ拡張する。**browser 自動化層のみ**。product core は変更しない。login 未済は fail-closed。成功の捏造はしない。

## 実装

| ファイル | 役割 |
|----------|------|
| `api/automation/browser_ai_operator_v1.py` | `--vision-assisted`、Playwright スクリーンショット連鎖、`run_vision_assisted_operator_v1` |
| `api/automation/screen_observe_and_action_select_v1.py` | `decide_screen_action_v1`（rule-based、vision API は `TENMON_SCREEN_OBSERVE_VISION_HOOK` 予約） |
| `api/automation/mac_vision_bridge_v1.py` | `screencapture -x` による display PNG（skeleton 経路） |

## CLI

```bash
cd /opt/tenmon-ark-repo/api
python3 automation/browser_ai_operator_v1.py \
  --provider chatgpt \
  --prompt-file /path/to/prompt.txt \
  --output-file /path/to/out.json \
  --vision-assisted
```

- **Playwright + chatgpt**: `TENMON_BROWSER_AI_ENGINE=playwright` で URL オープン → スクリーンショット → `after_navigate` パイプライン wait 判定 → 再スクリーンショット → 2 回目の rule 判定（vision 未接続時は `manual_required`）。
- **skeleton**: `open` + `pbcopy` + 送信試行後、`mac_vision_bridge` で display キャプチャ → `after_skeleton_open` wait 判定。

## Action 候補（screen_observe）

`click` / `type` / `paste` / `wait` / `done` / `manual_required` — 初版は deterministic rule + context の `screen_observe_v1.suggested_*` のみ（画素 vision は後段）。

## 出力 JSON（必須キー）

- `ok` — 最終 `last_action` が `done` かつ捏造なしで完了したときのみ `true`
- `provider`
- `actions_taken` — `{step, decision}` の列
- `last_action` — `decide_screen_action_v1` の結果オブジェクト
- `manual_review_required`
- `reason`

追加: `screen_state`（`screenshot_paths`, `action_log_path`）、`session_status`、`action_log_path`、`provider_status_path`、`next_on_pass` / `next_on_fail_note`

## Provider 別アーティファクト

- `api/automation/out/browser_vision_operator/<provider>/action_log_<ts>.json`
- `api/automation/out/browser_vision_operator/<provider>/status_<provider>.json`

## nextOnPass

`TENMON_TRUE_SELF_COMMIT_AFTER_ACCEPTANCE_CURSOR_AUTO_V1`

## nextOnFail

停止。vision-assisted retry 1 枚のみ生成。
