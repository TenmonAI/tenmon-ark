# TENMON_CONTINUOUS_ESCROW_HIGH_RISK_PREP_CURSOR_AUTO_V1

## 目的

high-risk 会話改善カードを無人投入せず escrow package を整備し、
朝の 1 承認で流せるようにする。

## 対象

- `api/automation/high_risk_escrow_approval_bridge_v1.py`
- `api/scripts/high_risk_escrow_approval_bridge_v1.sh`
- `api/automation/tenmon_high_risk_morning_approval_list.json`

## 仕様

- 既定: escrow package 作成のみ（`enqueue_ok:false`）
- `--approve --approve-by` 時のみ enqueue
- 親カードで morning approval list を集約

*Version: 1*

