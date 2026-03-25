# TENMON_LATEST_TRUTH_REBASE_AND_STALE_EVIDENCE_CLOSE_CURSOR_AUTO_V1

## 目的

stale / superseded / missing_generated_at artifact を論理的に閉じ、latest lived truth を単一真実源に再固定する。

## スコープ

- 変更対象は `api/automation/**`, `api/scripts/**`, `api/docs/constitution/**` のみ
- product code (`api/src/**`, `web/src/**`) は変更しない
- stale close は削除より truth rebasing を優先

## truth priority

1. current-run gate probes (`/api/health`, `/api/audit`, `/api/audit.build`)
2. current-run lived probes (`/api/chat` continuity)
3. latest lived completion artifacts
4. latest rejudge summary / verdict
5. latest system verdict / worldclass scorecard
6. superseded / missing_generated_at / invalid は truth source から除外

## stale close policy

- `missing_generated_at` は再生成可能なら current-run で再生成を試行
- 再生成不可なら `invalid=true` 扱いで truth source から除外
- `older_than_latest_refresh` のみなら latest truth へ差し替え（superseded 扱い）
- 物理削除は行わない

## 実行

```bash
bash api/scripts/tenmon_latest_truth_rebase_and_stale_evidence_close_v1.sh
```

内部で実行:

1. `tenmon_stale_evidence_invalidation_v1.py`
2. `tenmon_latest_state_rejudge_and_seal_refresh_v1.py`

## 受理条件

- `tenmon_latest_truth_rebase_summary.json.latest_truth_rebased == true`
- `tenmon_latest_truth_rebase_summary.json.truth_source_singleton == true`
- `missing_generated_at` は 0 または invalid closed
- `tenmon_latest_state_rejudge_and_seal_refresh_verdict.json` が current-run 更新

## 出力

- `api/automation/tenmon_latest_truth_rebase_summary.json`
- `api/automation/tenmon_latest_truth_rebase_report.md`
- `api/automation/tenmon_latest_state_rejudge_and_seal_refresh_verdict.json`

## NEXT

- PASS: `TENMON_CHAT_FINALIZE_META_BLACKOUT_AND_TECH_ROUTE_RELOCK_CURSOR_AUTO_V1`
- FAIL: `TENMON_LATEST_TRUTH_REBASE_AND_STALE_EVIDENCE_CLOSE_RETRY_CURSOR_AUTO_V1`
