# TENMON_CONTINUITY_HOLD_DENSITY_AND_SINGLE_SOURCE_REJUDGE_CURSOR_AUTO_V1

## 目的

最新観測で残っている主問題を、**順番固定**で一気に閉じる親カード。子は **並列禁止**。

## 子カード（実行順）

1. `TENMON_FIXTURE_DRAIN_AND_READY_QUEUE_CANONICALIZE_CURSOR_AUTO_V1`
2. `TENMON_CONTINUITY_ROUTE_HOLD_DENSITY_REPAIR_CURSOR_AUTO_V1`
3. `TENMON_REAL_EXECUTION_RESULT_EVIDENCE_BIND_CURSOR_AUTO_V1`
4. `TENMON_SINGLE_SOURCE_LATEST_TRUTH_REJUDGE_SYNC_CURSOR_AUTO_V1`
5. `TENMON_OVERNIGHT_DAEMON_REARM_AND_DIALOGUE_PRIORITY_REFRESH_CURSOR_AUTO_V1`

実装は `api/automation/tenmon_continuity_hold_density_and_single_source_rejudge_parent_v1.py` が既存 runner にブリッジ（`summary.json` の `steps[].bridge_note` 参照）。

## D

- 最小 diff
- 1 変更 = 1 検証
- product core の無関係改変禁止
- `dist/` 直編集禁止
- queue / result の success 捏造禁止
- stale source を success 材料に使わない
- acceptance PASS 以外 nextOnPass 禁止
- FAIL 時は証拠束を残して停止

## 完了条件（観測）

- fixture ready が主線 queue から外れる
- `CONTINUITY_ROUTE_HOLD_V1` の follow-up が 80〜160 字で返る
- real run 結果で `dry_run_started` が残らず、`touched_files` または `no_diff_reason` が埋まる
- rejudge / scorecard / system verdict が latest lived truth 優先で再同期される
- `next_best_card` が stale な K1 固定から外れ、fresh evidence ベースへ更新される
- overnight 次回起動の rearm 状態が残る

## 出力

- `api/automation/tenmon_continuity_hold_density_and_single_source_rejudge_summary.json`
- `api/automation/tenmon_continuity_hold_density_and_single_source_rejudge_report.md`
- FAIL 時: `api/automation/generated_cursor_apply/TENMON_CONTINUITY_HOLD_DENSITY_AND_SINGLE_SOURCE_REJUDGE_RETRY_CURSOR_AUTO_V1.md`

## next

- **PASS**: `TENMON_FIXTURE_DRAIN_AND_READY_QUEUE_CANONICALIZE_CURSOR_AUTO_V1`
- **FAIL**: 停止。retry 1 枚のみ（`TENMON_CONTINUITY_HOLD_DENSITY_AND_SINGLE_SOURCE_REJUDGE_RETRY_CURSOR_AUTO_V1`）
