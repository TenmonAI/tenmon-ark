# TENMON_RESULT_BIND_LATEST_CURRENT_RUN_QUEUE_MATCH_FIX_CURSOR_AUTO_V1

## 目的

`remote_cursor_result_bundle.json` に fixture / 旧 watch / non-fixture の `current_run` が混在しても、  
**最新の non-fixture `executor_session` entry** を決定的に選び、queue の `executed` と突合する。

## D（非交渉）

- 最小diff
- product core 不変更（`chat.ts` / `finalize.ts` / `web/src/**` 不変更）
- queue / result の既存 JSON shape を壊さない
- fixture success を acceptance に使わない
- stale success を使わない
- current-run evidence 必須
- dist 直編集禁止

## 実装

### `tenmon_autonomy_result_bind_to_rejudge_and_acceptance_v1.py`

- `entries` から `current_run==true` かつ `result_type==executor_session` かつ `queue_id` 非空のみ候補
- queue と突合し `fixture` を解決（突合不能は non-fixture 選定から除外）
- **fixture=true** の current-run は件数・queue_id のみ記録し、executed 判定に使わない
- non-fixture 候補を `ingested_at` 降順、同点は `state==executed` を優先して 1 件に絞る
- `queue_id` は queue item の `id` または `job_id` と一致すれば executed 突合可
- summary に `bundle_seen` / `match_strategy_used` / `blocked_reason` / `ignored_fixture_*` を追加
- MD: `tenmon_autonomy_result_bind_to_rejudge_and_acceptance_report.md`

### `tenmon_sleep_autonomy_master_bundle_v1.py`

- CARD 4 は `tenmon_autonomy_result_bind_to_rejudge_and_acceptance_summary.json` の確定値のみ使用
- PASS: `bundle_seen` + `current_run_queue_executed` + (`rejudge_refreshed` または `rejudge_pending_but_result_bound`)

## 検証

```bash
cd /opt/tenmon-ark-repo/api
python3 automation/tenmon_autonomy_result_bind_to_rejudge_and_acceptance_v1.py
cat automation/tenmon_autonomy_result_bind_to_rejudge_and_acceptance_summary.json | python3 -m json.tool
cat automation/tenmon_autonomy_result_bind_to_rejudge_and_acceptance_report.md
```

*Version: 1*
