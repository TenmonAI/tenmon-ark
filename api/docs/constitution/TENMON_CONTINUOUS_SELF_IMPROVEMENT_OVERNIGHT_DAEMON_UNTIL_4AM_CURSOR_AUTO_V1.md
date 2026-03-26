# TENMON_CONTINUOUS_SELF_IMPROVEMENT_OVERNIGHT_DAEMON_UNTIL_4AM_CURSOR_AUTO_V1

## 目的

自己改善ループを夜間デーモンとして 04:00 まで反復実行し、  
safe/medium は無人で進め、high-risk は escrow まで整備する。

## 実装

- `api/automation/tenmon_continuous_self_improvement_overnight_daemon_v1.py`
- `api/scripts/tenmon_continuous_self_improvement_overnight_daemon_v1.sh`

## デフォルト

- `TENMON_OVERNIGHT_TZ=Asia/Tokyo`
- `TENMON_OVERNIGHT_END_LOCAL=04:00`
- `TENMON_OVERNIGHT_CYCLE_SEC=300`
- `TENMON_OVERNIGHT_STOP_FILE=api/automation/tenmon_overnight_stop.signal`
- `TENMON_OVERNIGHT_LOCK_FILE=api/automation/.tenmon_overnight_daemon.lock`
- 任意: `TENMON_OVERNIGHT_MAX_CYCLES`（検証用）

## サイクル順序（固定）

1. runtime rescue
2. queue dedup/backpressure
3. continuous self-improvement master bundle
4. result bind / rejudge / scorecard
5. forensic refresh
6. high-risk escrow morning list refresh
7. heartbeat 更新
8. sleep

## 出力

- `api/automation/tenmon_continuous_self_improvement_overnight_daemon_summary.json`
- `api/automation/tenmon_continuous_self_improvement_overnight_daemon_report.md`
- `api/automation/tenmon_continuous_self_improvement_overnight_heartbeat.json`

## 停止条件

- local 04:00 到達
- stop sentinel file 存在
- duplicate daemon lock
- fatal health failure（runtime rescue + forensic が同時失敗）

## systemd（任意）

```bash
cd /opt/tenmon-ark-repo/api
python3 automation/tenmon_continuous_self_improvement_overnight_daemon_v1.py --write-systemd-unit
systemctl daemon-reload
systemctl enable --now tenmon-continuous-self-improvement-night.service
systemctl status tenmon-continuous-self-improvement-night.service --no-pager
```

## 手動起動（tmux など）

```bash
cd /opt/tenmon-ark-repo/api
TENMON_OVERNIGHT_CYCLE_SEC=300 \
bash scripts/tenmon_continuous_self_improvement_overnight_daemon_v1.sh
```

*Version: 1*

