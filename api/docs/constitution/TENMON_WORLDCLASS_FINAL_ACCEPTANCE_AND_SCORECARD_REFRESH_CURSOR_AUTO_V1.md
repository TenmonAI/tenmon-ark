# TENMON_WORLDCLASS_FINAL_ACCEPTANCE_AND_SCORECARD_REFRESH_CURSOR_AUTO_V1

## 目的

会話品質・自動構築・current-run 実行結果を scorecard に反映し、  
operable / worldclass readiness を最新化する。

## 実装（最小diff）

### `tenmon_worldclass_acceptance_scorecard_v1.py`

- `remote_cursor_queue.json` / `remote_cursor_result_bundle.json` を追加参照。
- `fixture=false` かつ `state=executed` の queue id と、`current_run=true` bundle queue_id の交差を  
  `signals.current_run_nonfixture_executed` として追加。
- 交差が無い場合は `must_fix_before_claim` に `current_run_nonfixture_executed_not_observed` を追加。
- `tenmon_latest_state_rejudge_summary.json` の `recommended_next_card` を優先して  
  `recommended_next_card` / `next_best_card` を **1本化**。

### `acceptance_orchestration_single_source_v1.py`

- 上記と同じ `current_run_nonfixture_executed` 判定を acceptance dimensions に追加。
- `next_best_card` を `rejudge -> scorecard -> fallback` の順で 1本に固定。

## NON-NEGOTIABLES

- stale success を根拠にしない
- fixture 成功を acceptance 根拠に使わない
- score 捏造禁止
- `dist/` 直編集禁止

## 実行

```bash
cd /opt/tenmon-ark-repo/api
python3 automation/tenmon_worldclass_acceptance_scorecard_v1.py || true
cat automation/tenmon_worldclass_acceptance_scorecard.json | python3 -m json.tool
python3 automation/acceptance_orchestration_single_source_v1.py --stdout-json || true
```

*Version: 1*

