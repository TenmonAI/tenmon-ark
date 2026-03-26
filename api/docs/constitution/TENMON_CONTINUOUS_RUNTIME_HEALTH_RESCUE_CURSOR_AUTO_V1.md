# TENMON_CONTINUOUS_RUNTIME_HEALTH_RESCUE_CURSOR_AUTO_V1

## 目的

watch/auth/queue 系の異常を検知し、safe rescue を 1 回だけ行う。

## 実装

- `api/automation/tenmon_continuous_runtime_health_rescue_v1.py`
- lock:
  - `api/automation/.tenmon_continuous_runtime_health_rescue_once.lock`
- summary:
  - `api/automation/tenmon_continuous_runtime_health_rescue_summary.json`

## 動作

- 失敗検知時に lock 未作成なら 1 回だけ rescue 試行
- `TENMON_RESCUE_ONE_SHOT_CMD` 指定時のみ実行、未指定なら提案のみ

*Version: 1*

