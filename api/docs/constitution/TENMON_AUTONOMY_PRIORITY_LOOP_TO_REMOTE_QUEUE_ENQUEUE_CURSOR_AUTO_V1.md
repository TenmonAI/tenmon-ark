# TENMON_AUTONOMY_PRIORITY_LOOP_TO_REMOTE_QUEUE_ENQUEUE_CURSOR_AUTO_V1

## 目的

forensic / worldclass priority loop / single-flight queue が決定した `next_best_card` / `safe_next_cards` を、
safe gate を通したうえで `remote_cursor_queue.json` に **non-fixture 実ジョブ**として自動投入し、
自己改善ループを「観測」から「自動着火」へ進める。

## 非交渉条件

- success 捏造禁止（ゲート不成立・high-risk は enqueue しない）
- stale truth 主導で enqueue しない
- fixture を主線に使わない（enqueue は `fixture:false`）
- queue 多重投入禁止 / 同一 card の pending 重複禁止
- `chat.ts` / `finalize.ts` / `web/src/**` の本体改変禁止（このカードは automation のみ）
- `dist/` 直編集禁止

## 入力（優先順）

1. `api/automation/tenmon_autonomy_current_state_forensic.json`
2. `api/automation/tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json`
3. `api/automation/tenmon_cursor_single_flight_queue_state.json`
4. `api/automation/state_convergence_next_cards.json`
5. `api/automation/conversation_quality_generated_cards.json`
6. `api/automation/tenmon_cursor_worktree_autocompact_summary.json`

## 次カード決定（1本）

以下を上から見て最初に見つかった 1 本を採用:

- forensic の `next_best_card`
- worldclass loop の `outputs.next_best_card`
- single-flight の `next_card`
- `state_convergence_next_cards.next_cards[0]`
- `conversation_quality_generated_cards.candidates[*].safe_auto_fix==true` の先頭

## enqueue gate（不成立なら enqueue しない）

- `forensic.system_ready == true`
- `forensic.watch_loop_stable == true`
- autocompact summary が存在し、72h 以内、かつ `review_file_count_gt_120` でない
- pending queue（`approval_required|ready|delivered`）が 3 以下
- **non-fixture delivered が 0**
- forensic / worldclass loop の stale が無い
- 同一 `cursor_card` が pending に存在しない
- high-risk card（chat/finalize/web/auth/queue/token/founder 等）は **manual gate**（enqueue しない）

## 出力

- `api/automation/tenmon_autonomy_priority_loop_to_remote_queue_enqueue_summary.json`
- `api/automation/tenmon_autonomy_priority_loop_to_remote_queue_enqueue_report.md`

## 実行

```bash
cd /opt/tenmon-ark-repo/api
python3 automation/tenmon_autonomy_priority_loop_to_remote_queue_enqueue_v1.py
```

または:

```bash
./scripts/tenmon_autonomy_priority_loop_to_remote_queue_enqueue_v1.sh
```

*Version: 1*

