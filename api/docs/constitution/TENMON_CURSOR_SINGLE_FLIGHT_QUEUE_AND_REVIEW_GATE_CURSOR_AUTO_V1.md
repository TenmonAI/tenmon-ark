# TENMON_CURSOR_SINGLE_FLIGHT_QUEUE_AND_REVIEW_GATE_CURSOR_AUTO_V1

## 目的

Cursor Agent にカードを積み増しし続けず、**単線（single-flight）**で  
「1 枚ずつ処理 → review flush → 次の 1 枚」へ寄せ、自動改善ループが**進むが膨らまない**状態を維持する。

## 非交渉条件

- queue を同時多重実行しない（待ち行列が閾値を超えたら次を出さない）
- review 膨張を許さない（変更ファイル数・high-risk 上限）
- current-run 証跡は保持（本スクリプトは観測・ゲートのみ、product core 非改変）
- success 捏造禁止

## 実行

```bash
cd /opt/tenmon-ark-repo/api
python3 automation/tenmon_cursor_single_flight_queue_v1.py
```

## ゲート（すべて満たすまで `next_card_allowed: false` になり得る）

| 条件 | 既定 |
|------|------|
| 変更ファイル数 | ≤ 120 |
| high-risk パス数 | ≤ 25 |
| `remote_cursor_queue` の pending（approval_required / ready / delivered）件数 | ≤ 3 |
| `tenmon_cursor_worktree_autocompact_summary.json` | 存在し、72h 以内かつ `review_file_count_gt_120` でない |
| `delivered` の queue `id` が `remote_cursor_result_bundle` に存在 | すべて bundle に記録 |
| `git status` が取得できない | 観測不能のためゲート不通過 |

## 次カードの優先（deterministic）

1. watch / result / acceptance / forensic / rejudge / priority loop 系  
2. conversation quality / auto priority / state_convergence  
3. K1 / general knowledge  
4. self_view / factual / polish  
5. worldclass / dialogue acceptance  

候補は次から収集し、重複除去のあと **tier 昇順 → カード名昇順**でソートし、先頭 **1 本**を `next_card` にする（常に 1 本に固定）。

- `tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json` の `outputs.safe_next_cards` / `outputs.next_best_card`
- `tenmon_autonomy_current_state_forensic.json` の `next_best_card` / `safe_next_cards`
- `tenmon_conversation_quality_priority_summary.json` の `recommended_next_cards`
- `state_convergence_next_cards.json` の `next_cards`
- `tenmon_conversation_worldclass_mainline_selector.json` の `safe_next_cards` / `next_best_card`

`current_card` は pending（approval_required / ready / delivered）のうち、**approval_required → ready → delivered** の順で先頭に来る 1 件の `cursor_card` とする。

## 出力

| ファイル | 内容 |
|---------|------|
| `api/automation/tenmon_cursor_single_flight_queue_state.json` | `next_card_allowed` / `blocked_reason` / `current_card` / `queued_cards` / `next_card` / `review_pressure` 等 |
| `api/automation/tenmon_cursor_single_flight_queue_report.md` | 人間可読 |

## Review 圧力（`review_pressure`）

`changed_files_ratio`（変更数÷120）・`high_risk_ratio`（high-risk 件数÷25）・`queue_pending_ratio`（pending 件数÷3）の **最大値**（いずれも上限 1.0）を `review_pressure` とする。詳細は `review_pressure_detail`。

## Review ゲート最適化（レポート）

- `changed_file_count` と `review_pressure`（上記複合）
- `git_classification.auto_accept_candidate`: `api/docs`・`api/automation`・`api/scripts` のみの変更で high-risk 0 のとき true
- `manual_review_recommended`: high-risk を含む変更があるとき true

## 関連

- `tenmon_cursor_worktree_autocompact_v1.py` … review 膨張時は先に実行

## チェーン（メタ）

- **nextOnPass**: `TENMON_OS_OUTPUT_CONTRACT_NORMALIZE_CURSOR_AUTO_V1`
- **nextOnFail**: 停止。`TENMON_CURSOR_SINGLE_FLIGHT_QUEUE_AND_REVIEW_GATE_RETRY_CURSOR_AUTO_V1` を **1 枚のみ**生成してから手戻り（成功の捏造なし）

*Version: 1*
