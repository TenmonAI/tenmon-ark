# TENMON_MAC_AUTONOMY_24H_SAFE_GUARD_CURSOR_AUTO_V1

## 目的

Mac 上の完全自律ループを **24 時間級**で回す前提として、**ガード / 停止 / ロック / バックオフ / スリープ対策**をポリシーと実装で固定する。

## 前提

- `TENMON_MAC_FULL_AUTONOMY_LOOP_RUNTIME_CURSOR_AUTO_V1` が PASS（`tenmon_mac_full_autonomy_loop_runtime_summary.json` の `mac_full_autonomy_loop_runtime_pass`）。

## 非交渉

- **overlap 禁止**: 単一プロセス用 `fcntl` 排他ロック（`tenmon_mac_autonomy_policy_v1.json` の `overlap.lock_rel_path`）。
- **consecutive fail stop**: `consecutive_failures >= consecutive_fail_max`（既定 3）で停止。
- **UI drift / login lost / browser・cursor 不可 / queue 破損**: 各フラグに応じて停止（`tenmon_mac_autonomy_state_v1.json`）。
- **sleep stop**: ハートビート間隔が `heartbeat_max_gap_sec` の数倍を超えた場合に watchdog 不合格（スリープ・長時間停止の検知）。
- **high-risk approval**: `approval.high_risk_requires_token` が true のとき、環境変数 `TENMON_AUTONOMY_HIGH_RISK_APPROVAL`（または policy で指定）が **非空**でないと進めない。
- **watchdog と state 保存**: `tenmon_mac_autonomy_state_v1.json` と `out/mac_autonomy_24h_guard/watchdog_last_heartbeat.json` を更新。

## ファイル

| ファイル | 役割 |
|----------|------|
| `api/automation/tenmon_mac_autonomy_policy_v1.json` | 閾値・停止条件・スリープ対策モード・再開方針 |
| `api/automation/tenmon_mac_autonomy_state_v1.json` | ランタイム状態（ハートビート・失敗回数・各種 OK フラグ） |
| `api/automation/tenmon_mac_autonomy_24h_guard_v1.py` | 検証・ロック・ハートビート・summary 出力 |

## Phase A — watchdog

- **lock**: 排他ロック取得に成功したら `lock_ok`。
- **heartbeat**: `heartbeat_at` を UTC で記録。
- **last screenshot**: `screencapture -x` で `out/mac_autonomy_24h_guard/watchdog_heartbeat_*.png`（`require_last_screenshot` が true のとき必須）。
- **last successful cycle**: `tenmon_mac_full_autonomy_state_v1.json` の `last_success_at` を `last_success_cycle_at` に取り込み。

## Phase B — stop policy

- ポリシースキーマ検証 + 上記停止条件 + `remote_cursor_queue.json` の JSON 整合性。
- **approval gate** 通過（トークン）を含め `stop_policy_ok` とする。

## Phase C — sleep prevention

- `sleep_prevention.mode`（例: `caffeinate_guidance`）を必須文字列として定義。
- 運用例: `caffeinate -dimsu`、launchd で `caffeinate` ラップ、電源設定の確認。

## Phase D — resume behavior

- `resume.interrupted_job`: `safe_discard` | `discard` | `retry_once` のいずれか（`resume_policy_ok`）。

## 受け入れ（summary）

- `watchdog_ok`
- `lock_ok`
- `stop_policy_ok`
- `resume_policy_ok`（ポリシー上の再開方針が有効値）
- `sleep_prevention_mode_defined`
- `mac_autonomy_24h_guard_pass`

## 出力

- `api/automation/tenmon_mac_autonomy_24h_guard_summary.json`
- `api/automation/tenmon_mac_autonomy_24h_guard_report.md`

## NEXT

- PASS → `TENMON_MAC_AUTONOMY_FINAL_ACCEPTANCE_CURSOR_AUTO_V1`
- FAIL → `TENMON_MAC_AUTONOMY_24H_SAFE_GUARD_RETRY_CURSOR_AUTO_V1`
