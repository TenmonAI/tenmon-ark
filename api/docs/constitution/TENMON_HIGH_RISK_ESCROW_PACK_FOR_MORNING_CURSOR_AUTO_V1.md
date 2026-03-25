# TENMON_HIGH_RISK_ESCROW_PACK_FOR_MORNING_CURSOR_AUTO_V1

## 目的

high-risk 会話コア修正カードを無人投入せず、  
朝の 1 承認で進められる escrow package を整備する。

## 実体

本カードの実体は以下:

- `api/automation/high_risk_escrow_approval_bridge_v1.py`
- `api/scripts/high_risk_escrow_approval_bridge_v1.sh`

## 動作

- 既定: escrow package 作成のみ（`enqueue_ok:false`）
- `--approve --approve-by <user>`: evidence OK の場合のみ queue へ enqueue

## 非交渉

- high-risk bypass 禁止
- 無人本番投入禁止
- success 捏造禁止
- dist 直編集禁止

*Version: 1*

