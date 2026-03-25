# TENMON_AUTONOMY_FIRST_LIVE_BOOTSTRAP_AND_SAFE_RUN_CURSOR_AUTO_V1

## Objective

safe scope のみで、自動運転の **first live cycle**（observe → choose → dispatch → delivery 観測 → result → **公式 ingest** → rejudge）を **current-run 証跡**付きで 1 回通すか、失敗位相を明示する。完成宣言ではなく、**生サイクルが回ったことの証明**が目的。

## Phase A — current-run observe（起動直後）

`tenmon_autonomy_first_live_state.json` に先行書き込みしたうえで、次をスナップショット化する（`current_run_observe`）。

- `remote_cursor_queue.json` / `remote_cursor_result_bundle.json`（オフセット・エントリ数含む）
- `tenmon_latest_truth_rebase_summary.json`
- `tenmon_latest_state_rejudge_summary.json` / `tenmon_latest_state_rejudge_and_seal_refresh_verdict.json`
- `operations_level_autonomy_state_v1.json`
- `tenmon_stale_evidence_invalidation_verdict.json`（参照のみ）
- `remote_bridge_delivery_log.jsonl` の **バイトオフセット**（この run 以降の tail の根拠）

## Phase B — bootstrap validation

必須: 方針 JSON・runtime triplet・キュー/バンドル実体・rejudge シェル・submit シェル・**FOUNDER_KEY 系**・rebase/rejudge summary ファイル存在。

## Phase C — choose

stale 優先は **`tenmon_latest_state_rejudge_and_seal_refresh_verdict.json` 準拠**（`stale_sources_present` または非空 `stale_sources`）。rebase の count だけに依存しない。

## Phase D/E — dispatch / delivery / ingest / rejudge

- `POST /api/admin/cursor/submit`（必要なら `approve`）
- キューに `job_id` が反映されるまで短時間待機
- `GET /api/admin/cursor/next` を **同一 job_id** が返るまでポーリング（`TENMON_FIRST_LIVE_PULL_TIMEOUT`、既定 120s）
- **新規** delivery log tail に `job_id` が含まれることと pull 成功の両方で `delivery_observed`
- 公式結果: **`POST /api/admin/cursor/result`**（`touched_files` は `api/automation/out/first_live_bootstrap/{run_id}/**` のみ — high-risk 禁止）
- バンドルに **当該 run_id** を含むエントリが増えるまで待機（`TENMON_FIRST_LIVE_BUNDLE_WAIT`）
- `bash scripts/tenmon_latest_state_rejudge_and_seal_refresh_v1.sh` + summary の mtime / `generated_at` で rejudge 更新を確認（失敗時のみ `POST /api/admin/rejudge/refresh` をフォールバック）

**禁止**: `remote_cursor_queue.json` / `remote_cursor_result_bundle.json` の直書き、fixture 注入、存在しない `.../result/ingest` への依存。

## Non-Negotiables

- `chat.ts` / `finalize.ts` / `web/src/**` は本カードでは編集しない
- queue / bundle 直書き禁止
- success 捏造禁止
- fail-fast、retry は環境変数による **待機上限 1 系統**（ポーリングのみ）

## Outputs

- `api/automation/tenmon_autonomy_first_live_state.json`
- `api/automation/tenmon_autonomy_first_live_summary.json`
- `api/automation/tenmon_autonomy_first_live_report.md`

## Pass（exit 0）

次がすべて true のときのみ exit 0。

- `bootstrap_validation_pass`
- `first_live_cycle_pass`
- `current_run_*_pass` 各種および `safe_scope_enforced` / `high_risk_not_touched`

## NEXT

- **PASS**: `TENMON_AUTONOMY_FINAL_OPERABLE_ACCEPTANCE_CURSOR_AUTO_V1`
- **FAIL**: `TENMON_AUTONOMY_FIRST_LIVE_BOOTSTRAP_RETRY_CURSOR_AUTO_V1`

*Version: 2*
