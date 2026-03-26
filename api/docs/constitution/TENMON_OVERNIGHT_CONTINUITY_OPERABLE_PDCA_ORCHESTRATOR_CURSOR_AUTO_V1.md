# TENMON_OVERNIGHT_CONTINUITY_OPERABLE_PDCA_ORCHESTRATOR_CURSOR_AUTO_V1

## 目的

19:30〜04:00 JST の夜間無人運転で、対象を広げずに **continuity / real execution evidence bind / single-source sync / operable seal** を優先順固定で閉じる。

## 実装

- `api/automation/tenmon_overnight_continuity_operable_pdca_orchestrator_v1.py`
- `api/scripts/tenmon_overnight_continuity_operable_pdca_orchestrator_v1.sh`

## 固定対象カード

1. `TENMON_CONTINUITY_ROUTE_HOLD_DENSITY_REPAIR_CURSOR_AUTO_V1`
2. `TENMON_REAL_EXECUTION_RESULT_EVIDENCE_BIND_CURSOR_AUTO_V1`
3. `TENMON_SINGLE_SOURCE_LATEST_TRUTH_REJUDGE_SYNC_CURSOR_AUTO_V1`
4. `TENMON_DAYBREAK_REARM_AND_DIALOGUE_PRIORITY_REFRESH_CURSOR_AUTO_V1`
5. `TENMON_FINAL_OPERABLE_SEAL_CURSOR_AUTO_V1`
6. `TENMON_OVERNIGHT_CONTINUITY_OPERABLE_PDCA_ORCHESTRATOR_CURSOR_AUTO_V1`（親）

## サイクル順序（並列禁止）

1. `preobserve`
   - `tenmon_latest_state_rejudge_and_seal_refresh_v1.py`
   - `tenmon_cursor_single_flight_queue_v1.py`
2. `priority resolve`（1本選択）
   - continuity density unresolved
   - result bundle current-run issue（`dry_run_started` / `touched_files=[] && no_diff_reason missing`）
   - stale split unresolved
   - final operable seal
   - `sealed_operable_ready=true` なら停止
3. `execute selected card`
4. `verify`（順固定）
   - build
   - restart
   - health
   - audit
   - audit.build
   - rejudge
   - scorecard

## lock / stop

- lock: `api/automation/.tenmon_overnight_continuity_operable_pdca_orchestrator.lock`
- stop: `api/automation/tenmon_overnight_continuity_operable_pdca_stop.signal`

## no fake daemon

- このカードは常駐「成功」を捏造しない。
- verify fail / execute fail は即 halt。
- retry stub のみ生成し、次サイクルへ進めない。

