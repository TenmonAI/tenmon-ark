# TENMON_MAC_CURSOR_EXECUTOR_RUNTIME_BIND_CURSOR_AUTO_V1

## Objective

Mac 側 Cursor executor を VPS の `remote_cursor` キューと結合できる実運転入口として、**VPS 上で dry bind** し state を固定する（実ジョブは実行しない）。

到達点:

- 実行方式を **Cursor CLI / Agent を第一候補（1 本）**として固定（`executor_mode: cursor_cli_primary`）
- queue / result bundle / manifest / Mac agent スクリプトの整合
- `current_run_bind_ok` と `transport_ambiguous=false`

## Non-Negotiables

- product core 編集禁止
- queue / result の直書き禁止（本カードは読み取りとテンプレ生成のみ）
- admin result route を定義から外さない
- transport の併記による曖昧化を success にしない

## Primary Scripts

- `api/automation/tenmon_mac_cursor_executor_runtime_bind_v1.py`
- `api/scripts/tenmon_mac_cursor_executor_runtime_bind_v1.sh`

## Outputs

- `api/automation/tenmon_mac_cursor_executor_runtime_bind_summary.json`
- `api/automation/tenmon_mac_cursor_executor_runtime_bind_report.md`

## NEXT

- PASS → `TENMON_AUTONOMY_FIRST_LIVE_BOOTSTRAP_AND_SAFE_RUN_CURSOR_AUTO_V1`
- FAIL → `TENMON_MAC_CURSOR_EXECUTOR_RUNTIME_BIND_RETRY_CURSOR_AUTO_V1`
