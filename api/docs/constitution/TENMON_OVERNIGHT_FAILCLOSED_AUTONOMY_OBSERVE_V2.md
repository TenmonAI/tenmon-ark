# TENMON_OVERNIGHT_FAILCLOSED_AUTONOMY_OBSERVE_V2

## 目的

`TENMON_OVERNIGHT_FAILCLOSED_AUTONOMY_SEAL_V1` が FAIL した場合に、  
修正を行わず詰まり点を観測し、次の retry / repair カードを 1 枚に絞る。

## ルール

- 観測専用（product core 無改変）
- dist / schema 直編集禁止
- seal 宣言禁止
- FAIL 原因を single next card に圧縮

## 観測対象

- infra: `/api/health`, `/api/audit`, `/api/audit.build`
- orchestration: heartbeat / single-flight / parent wiring
- fail-closed: morning approval / escrow / queue / result
- conversation floor: 4 固定 probe
- evidence bundle: summary / next-card JSON

## 出力

- `api/automation/tenmon_overnight_failclosed_autonomy_observe_v2_summary.json`
- `api/automation/tenmon_overnight_failclosed_autonomy_observe_v2_report.md`
- `api/automation/tenmon_overnight_failclosed_autonomy_observe_v2_next_card.json`

