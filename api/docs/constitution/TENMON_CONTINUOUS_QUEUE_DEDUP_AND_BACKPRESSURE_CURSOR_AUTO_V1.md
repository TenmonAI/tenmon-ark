# TENMON_CONTINUOUS_QUEUE_DEDUP_AND_BACKPRESSURE_CURSOR_AUTO_V1

## 目的

queue の pending 重複と過負荷を抑制し、継続運転中の膨張を防ぐ。

## 実装

- `api/automation/tenmon_continuous_queue_dedup_and_backpressure_v1.py`
- duplicate pending `cursor_card` を後勝ちでなく先頭優先で除去
- pending > 3 / nonfixture delivered 存在時は enqueue 停止判定

## 出力

- `api/automation/tenmon_continuous_queue_dedup_and_backpressure_summary.json`

*Version: 1*

