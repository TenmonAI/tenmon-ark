# TENMON_OVERNIGHT_FAILCLOSED_AUTONOMY_SEAL_V1

## 目的

夜間 fail-closed 自動運転が seal 候補に達したかを監査する。  
本カードは判定専用であり、PASS 以外で commit / seal を行わない。

## 判定対象

- infra: `build -> restart -> /api/health -> /api/audit -> /api/audit.build`
- orchestration: single-flight / heartbeat / stall recovery 導線
- fail-closed: morning approval / escrow / queue / result / retry hint
- conversation floor: 固定4 probe（法華経 / 即身成仏 / 水火 / 天聞）

## 出力

- `api/automation/tenmon_overnight_failclosed_autonomy_seal_summary.json`
- `api/automation/tenmon_overnight_failclosed_autonomy_seal_report.md`
- `api/automation/tenmon_overnight_failclosed_autonomy_seal_verdict.json`

## 終了コード

- PASS のみ `exit 0`
- それ以外は `exit 1`

## 運用ルール

- 観測優先・憶測禁止
- high-risk 自動適用禁止
- FAIL 時は evidence bundle を残して停止
- `decisionFrame.ku` / `routeReason` 契約を監査で破壊しない

