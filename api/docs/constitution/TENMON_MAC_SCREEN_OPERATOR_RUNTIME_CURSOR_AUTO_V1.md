# TENMON_MAC_SCREEN_OPERATOR_RUNTIME_CURSOR_AUTO_V1

## Objective

Mac 側でTENMON-ARKが画面を見て操作するための **最小実行基盤**（スクリーンショット・クリック・入力・ペースト・Chrome/Cursor 起動）を用意し、**current-run** で証跡を残す。

## Non-Negotiables

- **Mac ローカル専用**（`sys.platform != darwin` は fail-fast）
- 最小 diff・1 変更 = 1 検証
- VPS 側 product コードを変更しない（本カードは `api/automation` / `api/scripts` / constitution のみ）
- destructive 操作禁止
- **クリック座標のソース固定禁止** — 画面サイズから中央を算出（`click_center`）
- 権限不足・import 失敗は fail-fast
- current-run evidence 必須（`api/automation/out/mac_screen_operator_runtime/` 配下の PNG 等）

## Primary

- `api/automation/mac_screen_operator_v1.py` — `MacScreenOperator` 本体
- `api/automation/tenmon_mac_screen_operator_runtime_v1.py` — capability probe + proof + summary
- `api/scripts/tenmon_mac_screen_operator_runtime_v1.sh`

## Optional

- `api/automation/mac_local_env_probe_v1.py` — 依存 import の有無を JSON 出力

## Phase A — Capability

- Python: `pyautogui`, `Pillow (PIL)`, `pyperclip`
- CLI: `screencapture -x`
- アプリ: `open -a "Google Chrome"` / `open -a "Cursor"`（または `--skip-app-launch` で `/Applications/*.app` の存在のみ）

## Phase B — Operator

- `screenshot()`, `click_center()`, `type_text()`, `paste_text()`, `open_browser()`, `open_cursor()`

## Outputs

- `api/automation/tenmon_mac_screen_operator_runtime_summary.json`
- `api/automation/tenmon_mac_screen_operator_runtime_report.md`
- `api/automation/out/mac_screen_operator_runtime/*.png`（証跡）

## Environment

- `TENMON_MAC_OPERATOR_SKIP_APP_LAUNCH=1` — Chrome/Cursor の実起動をせずバンドル存在チェックのみ

## Acceptance（summary）

- `screen_capture_ok`, `browser_open_ok`, `cursor_open_ok`, `paste_ok`, `current_run_evidence_ok`, `mac_screen_operator_runtime_pass`

## NEXT

- PASS → `TENMON_MAC_OPERATOR_DECISION_API_BIND_CURSOR_AUTO_V1`
- FAIL → `TENMON_MAC_SCREEN_OPERATOR_RUNTIME_RETRY_CURSOR_AUTO_V1`
