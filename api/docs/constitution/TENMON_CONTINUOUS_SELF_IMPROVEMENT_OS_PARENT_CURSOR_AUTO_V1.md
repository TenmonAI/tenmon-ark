# TENMON_CONTINUOUS_SELF_IMPROVEMENT_OS_PARENT_CURSOR_AUTO_V1

## 目的

safe/medium の自律運転、result bind、scorecard 更新、high-risk escrow 整備を
継続実行できる自己改善 OS 親カードを固定する。

## 実装

- `api/automation/tenmon_continuous_self_improvement_os_master_bundle_v1.py`
- `api/scripts/tenmon_continuous_self_improvement_os_master_bundle_v1.sh`

順序:
1) runtime/watch/queue 観測
2) priority enqueue
3) result bind + scorecard
4) high-risk escrow + morning approval list
5) conversation worldclass selector
6) state seal
7) insurance runtime rescue
8) insurance queue dedup/backpressure

## 出力

- `api/automation/tenmon_continuous_self_improvement_os_summary.json`
- `api/automation/tenmon_continuous_self_improvement_os_report.md`

## 非交渉

- stale/fixture 成功を completion 根拠にしない
- high-risk は escrow 止まり（approve 時のみ enqueue）
- dist 直編集禁止

*Version: 1*

