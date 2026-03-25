# TENMON_AUTONOMY_FINAL_OPERABLE_ACCEPTANCE_CURSOR_AUTO_V1

## Objective

TENMON-ARK の autonomy / closed loop / overnight / conversation completion について、**いま operable と言える最終条件** を current-run 根拠で固定する。worldclass 完了宣言カードではない。

確定するもの:

- first live bootstrap proven
- real current-run closed loop proven
- overnight resume proven
- service stable（健康・監査系の観点）
- stale truth が fatal で支配していない
- safe autonomy operable
- high-risk 自動パッチがブロックされているか、明示的に gate green
- 次の未完了 frontier が 1 本明示できるか（`next_frontier_clear`）

## Non-Negotiables

- stale truth を success 根拠にしない
- current-run evidence 必須（入力 summary / verdict にタイムスタンプがあること）
- high-risk 自動パッチを勝手に green にしない
- product core untouched を前提に判断
- fail-fast（集約失敗時は exit 非 0）
- summary / report 必須
- PASS 以外 seal / worldclass claim 禁止
- operable と worldclass を混同しない

## Inputs（読み取り）

- `api/automation/tenmon_autonomy_first_live_summary.json`
- `api/automation/tenmon_real_closed_loop_current_run_acceptance_summary.json`
- `api/automation/tenmon_overnight_full_autonomy_summary.json`
- `api/automation/tenmon_latest_state_rejudge_and_seal_refresh_verdict.json`
- `api/automation/tenmon_system_verdict.json`
- `api/automation/tenmon_worldclass_acceptance_scorecard.json`
- `api/automation/dangerous_patch_blocker_report.json`
- 補助: `tenmon_latest_truth_rebase_summary.json`, `tenmon_stale_evidence_invalidation_verdict.json`, `tenmon_execution_gate_hardstop_verdict.json`

## 6-card master chain モード

環境変数 `TENMON_OPERABLE_6CARD_MODE=1`（`true` / `yes` 可）のとき、次の入力を追加で要求し、`overnight_cycle_alive` / `mac_bind_ok` / `high_risk_approval_enforced` を `pass` に含める。

- `tenmon_mac_cursor_executor_runtime_bind_summary.json`
- `tenmon_overnight_resume_summary.json`
- `tenmon_high_risk_approval_contract_summary.json`

マスター `tenmon_autonomy_to_operable_6card_master_chain_v1.py` はこのモードで最終カードを起動する。

## Criteria（boolean）

1. `first_live_bootstrap_proven` — bootstrap + cycle + current_run_evidence_ok
2. `real_closed_loop_proven` — RCL summary の `real_closed_loop_proven`
3. `overnight_resume_proven` — overnight summary が resume カードかつ前提 PASS、`cycle_count >= 1`、evidence / safe scope / `resume_possible`
4. `service_operable` — rejudge verdict: `health_ok`, not `env_failure`, `audit_ok`
5. `stale_truth_not_fatal` — truth rebase `stale_sources_count == 0` かつ stale invalidation に `fatal` がない
6. `safe_scope_operable` — first live と overnight の `safe_scope_enforced`
7. `high_risk_auto_patch_still_blocked_or_explicitly_green` — dangerous patch `blocked` または（非 blocked かつ execution gate `pass` かつ not `must_block`）
8. `next_frontier_clear` — system または scorecard に推奨カードが入っている

## Bands

- **OPERABLE_SAFE_AUTONOMY** — 上記 7 つ（high_risk 行を含む）がすべて真で、入力 evidence が揃う
- **PARTIAL_OPERABLE_NEEDS_MANUAL_REVIEW** — evidence OK かつ 7 項目中 5 以上が真だがフル PASS ではない
- **NOT_OPERABLE** — それ以外

## Acceptance

### PASS（`pass: true`）

上記 7 項（first live ～ high_risk 行）がすべて真、`sources_current_run_evidence_ok` が真、`operable_band == OPERABLE_SAFE_AUTONOMY`。

### 条件付き（`conditional_pass: true`）

`operable_band == PARTIAL_OPERABLE_NEEDS_MANUAL_REVIEW` でフル PASS でない場合。

### FAIL

いずれか欠ける、service 不安定、stale fatal、current-run 根拠なし。

## Outputs

- `api/automation/tenmon_autonomy_final_operable_acceptance_summary.json`
- `api/automation/tenmon_autonomy_final_operable_acceptance_report.md`

## Invocation

```bash
api/scripts/tenmon_autonomy_final_operable_acceptance_v1.sh
# または
python3 api/automation/tenmon_autonomy_final_operable_acceptance_v1.py --repo-root "$TENMON_REPO_ROOT"
```

## Exit code

- `0` — `pass` または `conditional_pass`
- `1` — 上記以外（NOT_OPERABLE かつ条件付きも不可）
