# TENMON_AUTONOMY_RESULT_BIND_TO_REJUDGE_AND_ACCEPTANCE_CURSOR_AUTO_V1

## 目的

Mac executor の current-run result を `executed` / bundle 記録で止めず、  
rejudge / acceptance / scorecard 更新へ自動接続する。

## 入力

- `api/automation/remote_cursor_result_bundle.json`
- `api/automation/remote_cursor_queue.json`
- `api/automation/tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json`

## 判定フロー

1. bundle から最新 `current_run=true` entry を取得  
2. queue から最新 `state=executed && fixture=false` item を取得  
3. `entry.queue_id == queue.id` なら current-run executed 成立  
4. かつ stale（bundle entry >24h）でなければ:
   - `tenmon_latest_state_rejudge_and_seal_refresh_v1.py` 実行
   - `tenmon_worldclass_acceptance_scorecard_v1.py` 実行

## 出力

- `api/automation/tenmon_autonomy_result_bind_to_rejudge_and_acceptance_summary.json`

必須項目:
- `current_run_result_seen`
- `current_run_queue_executed`
- `rejudge_refreshed`
- `scorecard_refreshed`
- `stale_sources_present`
- `next_best_card`

## NON-NEGOTIABLES

- stale success 禁止
- fixture success を acceptance 根拠に使わない
- result API 契約は変更しない
- `dist/` 直編集禁止

## 実行

```bash
cd /opt/tenmon-ark-repo/api
python3 automation/tenmon_autonomy_result_bind_to_rejudge_and_acceptance_v1.py
cat automation/tenmon_autonomy_result_bind_to_rejudge_and_acceptance_summary.json | python3 -m json.tool
```

*Version: 1*

