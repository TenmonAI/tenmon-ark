# TENMON_MAC_WATCH_LOOP_REAL_EXECUTION_ENABLE_FOR_APPROVED_HIGH_RISK_CURSOR_AUTO_V1

## 目的

Mac 側 `tenmon_cursor_watch_loop.sh` の **dry-run 固定を廃止**し、  
**承認済み high-risk・non-fixture・current-run** のジョブだけ **real execution**（`CURSOR_EXECUTOR_DRY_RUN=0`）へ切り替える。

## D（非交渉）

- 最小 diff
- `api/scripts/tenmon_cursor_watch_loop.sh` を主対象（result バンドルに `real_execution_enabled` / `escrow_approved` を残すため `adminCursorResult.ts` に任意フィールド 2 つのみ追加可）
- fixture は **release のみ**（従来どおり result completion しない）
- 未承認 high-risk は real execution 禁止（既定）
- `escrow_approved=true` が real の必要条件（`TENMON_REAL_EXEC_REQUIRE_ESCROW_APPROVED=1` 時）
- result 契約維持
- success 捏造禁止
- dist 直編集禁止

## 環境変数

| 変数 | 既定 | 説明 |
|------|------|------|
| `TENMON_FORCE_DRY_RUN` | `0` | `1` のとき常に dry-run（判定を上書き） |
| `TENMON_REAL_EXEC_REQUIRE_ESCROW_APPROVED` | `1` | `1` のとき `escrow_approved=true` が無い job は real にしない |

## 判定（`.item`）

`NEXT` / `next` 応答の `item` から読む:

- `fixture`
- `dry_run_only`
- `current_run`（**JSON で明示 `true` のときのみ** real 候補。`null` は POST 上は current-run 扱いで `true` 寄せしつつ、real 判定には使わない）
- `escrow_approved`
- `high_risk`（`item.high_risk==true` または `risk_tier=="high"`）**または** `enqueue_reason=="escrow_human_approval"`（high-risk escrow bridge 経路の単一真実源）

**real execution** 条件（すべて満たす）:

- `fixture` が true でない（fixture は先に release して return）
- **high-risk 扱い**（上記いずれか）であること
- `TENMON_FORCE_DRY_RUN!=1`
- `dry_run_only` が true でない
- `current_run` が JSON 上明示 `true`（`null` は real 候補にしない）
- `TENMON_REAL_EXEC_REQUIRE_ESCROW_APPROVED=1` なら `escrow_approved==true`

一般の non-fixture（high-risk でない）ジョブは **常に dry-run**（未承認 high-risk や通常カードを勝手に本実行しない）。

上記以外は **dry-run**。

## 実装挙動

### real execution 時

- `export CURSOR_EXECUTOR_DRY_RUN=0`
- ログ: `executor_real_run` / `executor_real_run_cmd`
- **stub** の `cursor_job_session_manifest` / `mac_executor_state` / `dangerous_patch_block_report` **ファイルは作らない**（パスは空文字）
- `POST /admin/cursor/result` に  
  `dry_run:false`, `real_execution_enabled:true`, `escrow_approved`（item の真偽）, `log_path` は executor ログ  
- `touched_files` は git 差分（repo root が取れる場合）

### dry-run 時

- `export CURSOR_EXECUTOR_DRY_RUN=1`
- ログ: `executor_dry_run` / `executor_dry_run_cmd`
- 従来どおり stub manifest/state/report を生成
- `POST` に `dry_run:true`, `real_execution_enabled:false`, `escrow_approved`（item の真偽）, `log_path` はセッションログ

## 検証

```bash
bash -n api/scripts/tenmon_cursor_watch_loop.sh
```

- `export CURSOR_EXECUTOR_DRY_RUN=1` の **ハードコードが無い**こと
- approve 済み（`escrow_approved=true`）かつ `current_run=true` の **high-risk（または `enqueue_reason=escrow_human_approval`）** non-fixture で `executor_real_run` ログが出ること
- 同条件でも high-risk でない通常 non-fixture は `executor_dry_run` のままであること
- fixture は release のみ

## nextOnPass

`TENMON_CURSOR_EXECUTOR_REAL_RESULT_AND_TOUCHFILES_BIND_CURSOR_AUTO_V1`

## nextOnFail

停止。watch loop real/dry retry 1 枚のみ生成。

*Version: 3*
