# TENMON_REAL_CLOSED_LOOP_CURRENT_RUN_ACCEPTANCE_CURSOR_AUTO_V1

## Objective

fixture / stale artifact を根拠にせず、同一 current-run の `RUN_ID` / `JOB_ID` のみで end-to-end の closed loop を確定する。

## Non-Negotiables

- queue / result bundle の手編集禁止
- 過去の delivery / result / rejudge を成功扱いしない
- 公式 `POST /api/admin/cursor/submit` と `POST /api/admin/cursor/result` のみ（ingest の正）
- `remote_cursor_result_ingest_v1.py` は API と同じファイルマージのオフライン用。本カードの acceptance は **API 経路**を採用し、二重 append を避ける。

## Evidence

- Phase A: `RUN_ID`, `JOB_ID`（submit 後）, `START_TS`
- Phase B: queue / bundle / delivery log / rejudge の pre-snapshot
- Phase C–G: submit → queue 反映 → delivery（新規 tail 推奨）→ GET `/next` → POST result → bundle 検証 → rejudge 更新

## Outputs

- `api/automation/tenmon_real_closed_loop_current_run_acceptance_summary.json`
- `api/automation/tenmon_real_closed_loop_current_run_acceptance_report.md`

summary には少なくとも次を含む: `run_id`, `job_id`, `real_*` 各フラグ, `fixture_detected`, `stale_detected`, `mixed_run_detected`, `failed_phase`, `stop_reason`, `recommended_next_card`（既定: `TENMON_OVERNIGHT_FULL_AUTONOMY_RESUME_AFTER_FIRST_LIVE_PASS_CURSOR_AUTO_V1`）。

## PASS

`real_closed_loop_proven == true`（`real_queue_submit` … `real_rejudge_refresh` すべて true）。成功時は `failed_phase` が null、`stop_reason` が `real_closed_loop_accepted`。

## Delivery 厳密化

`delivery_log` の **pre-run 以降の tail** に `JOB_ID` が現れ、かつ `GET /api/admin/cursor/next` が同一 `JOB_ID` を返すことの両方を満たす場合のみ `real_delivery_observed` とする。

## Runner

```bash
api/scripts/tenmon_real_closed_loop_current_run_acceptance_v1.sh
```

環境: `FOUNDER_KEY` または `TENMON_REMOTE_CURSOR_FOUNDER_KEY`、`TENMON_GATE_BASE`（既定 `http://127.0.0.1:3000`）。
