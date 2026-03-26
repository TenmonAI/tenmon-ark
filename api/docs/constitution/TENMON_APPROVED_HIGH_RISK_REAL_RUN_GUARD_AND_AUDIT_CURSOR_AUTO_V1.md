# TENMON_APPROVED_HIGH_RISK_REAL_RUN_GUARD_AND_AUDIT_CURSOR_AUTO_V1

## 方針（fail-closed）

- high-risk を承認なしで real 実行しない。real は **guard 通過後のみ**。
- guard 不一致・executor 失敗時は **証拠束**（JSON + `git status` テキスト）を Mac ログディレクトリに残す。
- 成功の捏造は禁止。未承認・条件欠落は **dry-run に落とす**。

## `/admin/cursor/next` 契約（最小透過）

キュー JSON に存在する次を manifest に載せる（Mac guard が参照する）:

- `current_run`（厳密に `true` のときのみ real 候補）
- `escrow_approved`
- `risk_tier` / `high_risk`（高リスク判定。`enqueue_reason=escrow_human_approval` でも `high_risk: true`）
- `enqueue_reason`（参照用）
- `cursor_card`（`cursor_card` と `card_name` の解決値を透過）

実装: `api/src/routes/adminCursorCommand.ts` の `buildNextManifestPayload`。

## `api/scripts/tenmon_cursor_watch_loop.sh`

### real 直前 guard（すべて満たすこと）

- `escrow_approved=true`
- `fixture=false`（fixture は先に release のみで return）
- `current_run=true`（`.item.current_run == true`）
- `cursor_card`（`cursor_card` または `card_name`）が非空
- `high_risk` のときは上記に加え **escrow 承認必須**（未承認なら real 不可）

### ログ

- 通過: `real_guard_pass id=... card=...`
- 失敗: `real_guard_fail id=... reason=...`（カンマ区切り）
- executor 失敗: `executor_nonzero_exit id=...`

### 証拠束（FAIL 時）

- **guard 失敗**: `real_execution_audit_guardfail_<ts>_<qid>.json` + `git_status_guardfail_<ts>_<qid>.txt`
- **executor 失敗（real）**: `real_execution_audit_executorfail_<ts>_<qid>.json` + `git_status_executorfail_<ts>_<qid>.txt`

各 audit JSON に最低限: `queue_id`, `session_id`, `session_log`, `touched_files`（配列）, `git_status_path`。

### result payload

- real でも `dangerous_patch_block_report` に **ファイルパス**を載せる（`dangerous_patch_block_report_real_<ts>_<qid>.json` スタブ）。

## 受け入れ

- 未承認の high-risk は real されない。
- 承認済み high-risk は guard pass のみ real。
- FAIL 時に audit ファイルが残る。
- Mac の `watch_loop.log` に `real_guard_pass` / `real_guard_fail` / `executor_nonzero_exit` が現れる。

## nextOnPass

`TENMON_IMPROVEMENT_LEDGER_CURSOR_AUTO_V1`

## nextOnFail

停止。`TENMON_APPROVED_HIGH_RISK_REAL_RUN_GUARD_AND_AUDIT_RETRY_CURSOR_AUTO_V1` を 1 枚のみ生成してから手戻り（成功の捏造なし）。
