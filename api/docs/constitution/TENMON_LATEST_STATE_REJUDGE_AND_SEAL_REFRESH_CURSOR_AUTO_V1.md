# TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_CURSOR_AUTO_V1

## 目的

最新実装を単一真実源として再観測し、stale blocker / readiness / verdict を更新して、
以後の seal 判断の基底となる current truth を 1 枚へ再集約する。

## D

- 観測優先、憶測禁止
- cause 未断定 patch 禁止
- 最小 diff
- 既存 runtime / mainline 契約を壊さない
- 生成物は `api/automation/` に閉じる
- FAIL 時は証拠束を残して exit != 0
- repo → build → audit → forensic の順（Cursor-local: restart なし）
- stale report 上書きは可、raw evidence は残す
- final claim は本カードでは行わない

## 入力ソース（latest priority）

優先順（latest truth）:

1. continuity latest probe（2-turn same thread）
2. latest gate check（`/api/health`, `/api/audit`, `/api/audit.build`）
3. latest hygiene verdict（`tenmon_repo_hygiene_watchdog_verdict.json`）
4. latest lived readiness（`pwa_lived_completion_readiness.json`）
5. latest system/worldclass inputs（system verdict / scorecard）

参照ファイル:

- `tenmon_system_verdict.json`
- `tenmon_current_state_detailed_report.json`
- `pwa_lived_completion_readiness.json`
- `pwa_final_completion_readiness.json`
- `tenmon_worldclass_acceptance_scorecard.json`
- `tenmon_repo_hygiene_watchdog_verdict.json`
- `tenmon_remote_admin_cursor_runtime_proof_verdict.json`
- `tenmon_self_build_execution_chain_verdict.json`
- `tenmon_self_repair_safe_loop_verdict.json`
- `tenmon_self_repair_acceptance_seal_verdict.json`
- `pwa_playwright_preflight.json`
- `tenmon_chat_continuity_deep_forensic.json`
- `tenmon_latest_state_rejudge_summary.json`

## 判定ルール

### live probes

1. `GET /api/health`
2. `GET /api/audit`
3. `GET /api/audit.build`
4. 2-turn continuity probe (`/api/chat`, same threadId)

### continuity success

- `chat1.threadId == chat2.threadId`
- `chat2.routeReason` が以下のいずれか:
  - `CONTINUITY_ROUTE_HOLD_V1`
  - `CONTINUITY_` 系 / `FOLLOWUP` 系
  - `EXPLICIT_CHAR_PREEMPT_V1` carry が確認できる
  - thread core carry が確認できる
- `NATURAL_GENERAL_LLM_TOP` は fail

### env / product 分離

- `pwa_playwright_preflight.usable == false` は env_failure
- env_failure 単独で product_failure にしない

### stale 定義 / supersede

- generated_at/timestamp 欠落または古すぎ
- 最新 live probe と既存 json が矛盾
- env_failure 中の lived blocker が product 扱いで混在
- stale と判定した source は削除せず、`superseded_sources` に
  `reason=superseded_by_latest_lived_truth` で退避

### candidate rules

- `operable_ready_candidate=true`:
  - health/audit/audit.build ok
  - continuity ok
  - `repo_must_block_seal=false` または cleanup-only residue
  - self_build chain closed
- `worldclass_ready_candidate`: **観測のみ** — `tenmon_worldclass_acceptance_scorecard.json` の `worldclass_ready==true` かつ `tenmon_system_verdict.json` の `completion_gate` / `os_gate` がいずれも false でない（ファイルが無い場合は worldclass 候補にしない）
- `worldclass_claim_ready`: `seal_ready` かつ `operable_ready` かつ `worldclass_ready_candidate`
- `remaining_blockers` に scorecard / system verdict の観測タグを付与（例: `scorecard_worldclass_not_ready`, `system_verdict_completion_gate_false`）— **推測で PASS を付けない**

### next card

- stale あり → `TENMON_STALE_EVIDENCE_INVALIDATION_CURSOR_AUTO_V1`
- stale なし && operable 候補あり → `TENMON_FINAL_OPERABLE_SEAL_CURSOR_AUTO_V1`
- それ以外 → `TENMON_FAIL_FAST_CAMPAIGN_GOVERNOR_CURSOR_AUTO_V1`

## 出力

- `api/automation/tenmon_latest_state_rejudge_and_seal_refresh_verdict.json`
- `api/automation/tenmon_latest_state_rejudge_summary.json`
- `api/automation/tenmon_latest_state_rejudge_and_seal_refresh_report.md`

summary 必須キー:

- `seal_ready`
- `operable_ready`
- `worldclass_claim_ready`
- `remaining_blockers`
- `recommended_next_card`
- `latest_sources`
- `stale_sources`
- `superseded_sources`

## FAIL policy

- `pass=false`（`seal_ready` が false）なら exit 非ゼロ
- raw evidence（health/audit/audit.build + chat probe）をログに残す

## チェーン（メタ）

- **nextOnPass**: `TENMON_MAC_CURSOR_EXECUTOR_RUNTIME_BIND_CURSOR_AUTO_V1`
- **nextOnFail**: 停止。`TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_RETRY_CURSOR_AUTO_V1` を **1 枚のみ**生成してから手戻り（成功の捏造なし）
