# TENMON_AUTONOMY_HEARTBEAT_ALERT_AND_STALL_RECOVERY_CURSOR_AUTO_V1

## 目的

overnight heartbeat・queue・result bundle の **stall を JSON で検知**し、**復帰候補**を明示する。stop ファイルがある間は **観測 state の更新も自動 recovery も行わない**（fail-closed）。成功の捏造はしない。

## D

- 最小 diff（automation / constitution のみ）
- product core 不変更
- fail-closed（stop 時は no-op）
- `recovery_executed` は **実際に走らせた subprocess の exit のみ**を根拠にする

## 実行

```bash
export TENMON_REPO_ROOT=/path/to/tenmon-ark-repo
python3 api/automation/autonomy_stall_recovery_v1.py
```

任意（stall 検知時のみ、stop なし）:

```bash
export TENMON_STALL_RECOVERY_EXECUTE=1   # または --execute
# 任意: systemd 再起動も試す（要 sudo -n と unit 実装）
export TENMON_STALL_RECOVERY_RESTART_SYSTEMD=1
python3 api/automation/autonomy_stall_recovery_v1.py --execute
```

## 入力・閾値（環境変数）

| 変数 | 既定 | 意味 |
|------|------|------|
| `TENMON_OVERNIGHT_STOP_FILE` | `api/automation/tenmon_overnight_stop.signal` | 存在時はスキップ |
| `TENMON_STALL_HEARTBEAT_PATH` | `.../tenmon_continuous_self_improvement_overnight_heartbeat.json` | 監視対象 heartbeat |
| `TENMON_STALL_HEARTBEAT_MAX_AGE_SEC` | `900` | `updated_at` がこれより古い → `heartbeat_stale` |
| `TENMON_STALL_DELTA_MIN_SEC` | `600` | 前回 state からの経過秒（差分 stall 用） |
| `TENMON_STALL_BUNDLE_FLATLINE_MIN_SEC` | `1200` | bundle 件数不変の最小経過 |

## 出力

- `api/automation/autonomy_stall_recovery_summary.json` — `stall_detected`, `stall_reasons`, `recovery_candidates`, `recovery_attempted`, `recovery_executed`
- `api/automation/autonomy_stall_recovery_observation_state.json` — 次回差分用スナップショット（**stop ファイルありの実行では更新しない**）

## stall 理由コード（例）

- `heartbeat_missing` / `heartbeat_stale` / `heartbeat_updated_at_unparseable`
- `cycle_not_advancing`（前回 state あり・経過十分・`cycle` 不変）
- `queue_ready_delivered_frozen`（queue `updatedAt` と ready/delivered 件数が前回と同一）
- `result_bundle_no_growth`（bundle 件数が前回と同一・経過が bundle 閾値以上）

## next

- **nextOnPass**: `TENMON_AUTONOMY_MORNING_APPROVAL_EXECUTION_CHAIN_CURSOR_AUTO_V1`
- **nextOnFail**: 停止。stall recovery retry 1 枚のみ生成。
