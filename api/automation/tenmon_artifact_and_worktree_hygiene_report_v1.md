# TENMON_ARTIFACT_AND_WORKTREE_HYGIENE_REPORT_V1

- **card**: `TENMON_ARTIFACT_AND_WORKTREE_HYGIENE_CURSOR_AUTO_V1`
- **役割**: `tenmon_cursor_worktree_autocompact_v1.py` を呼び出し、揮発 automation 退避後に KEEP・主線ソース・queue・`npm run check` を検証（**commit なし**）

## KEEP（必須残存）

- `api/automation/tenmon_cursor_single_flight_queue_state.json`
- `api/automation/tenmon_cursor_worktree_autocompact_summary.json`

## 主線ソース（存在確認のみ・退避禁止）

- book learning / seal / uplift / deep x-ray 関連 `api/src/core/*` および `api/src/routes/chat.ts`

## 次カード

- **nextOnPass**: `TENMON_POST_FINAL_5CARDS_COMPLETION_XRAY_V1`
- **nextOnFail**: `TENMON_ARTIFACT_AND_WORKTREE_HYGIENE_RETRY_CURSOR_AUTO_V1`

<!-- ARTIFACT_WORKTREE_HYGIENE_AUTO_BEGIN -->

- **acceptance_pass**: `True`
- **npm_run_check_ok**: `True`
- **dry_run**: `False`
- **git_status_short_before**: `104`
- **git_status_short_after**: `127`
- **automation_dirty_lines**: `45` → `68`
- **autocompact_moved_approx**: `12`
- **autocompact_delta_changed**: `23`

<!-- ARTIFACT_WORKTREE_HYGIENE_AUTO_END -->
