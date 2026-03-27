# TENMON_AUTONOMY_IMPLEMENTATION_ORDER_STATUS_FORENSIC_REPORT_CURSOR_AUTO_V1

## 目的

`TENMON_AUTONOMY_IMPLEMENTATION_ORDER_CHECKLIST_V1` 相当の項目について、**実装・artifact・runtime gate** を読み取りのみで棚卸しする。product / web / api の挙動は変更しない。

## SSOT

- 生成: `python3 api/automation/tenmon_autonomy_implementation_order_status_forensic_v1.py`
- 出力:
  - `api/automation/tenmon_autonomy_implementation_order_status_report.json`
  - `api/automation/tenmon_autonomy_implementation_order_status_report.md`
  - `api/automation/tenmon_autonomy_implementation_order_status_phase_summary.json`
  - `api/automation/tenmon_autonomy_implementation_order_next_actions.json`

## 判定

- `PASS`: constitution + コード参照に加え、該当する **厳格な artifact / gate** がある場合のみ（項目ごとにスクリプト内定義）
- `PARTIAL`: 実装・文書はあるが runtime 証拠が弱い
- `BLOCKED`: seal / scorecard 等で明示的に塞がれている
- `NOT_STARTED`: 根拠が見つからない

## 環境変数（任意）

- `TENMON_REPO_ROOT`
- `TENMON_REMOTE_CURSOR_QUEUE_PATH` / `TENMON_REMOTE_CURSOR_RESULT_BUNDLE_PATH`
