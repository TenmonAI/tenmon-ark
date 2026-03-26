# TENMON_QUEUE_DEDUP_BACKPRESSURE_AND_FIXTURE_DRAIN_CURSOR_AUTO_V1

## 目的

`remote_cursor_queue.json` の **重複 pending・backpressure・fixture の delivered 滞留**を整理し、**主線（non-fixture）が埋もれない**ようにする。**queue 契約**（`state_schema` / 状態機械）を維持し、**成功の捏造はしない**。

## 実装

- `api/automation/tenmon_continuous_queue_dedup_and_backpressure_v1.py`（legacy カード名は summary の `legacy_card` に記録）

## 処理順（同一実行内）

1. **fixture drain**: `fixture`（または `dry_run_only`）かつ `delivered` で、リース期限切れ **または** `createdAt` から `TENMON_QUEUE_FIXTURE_DELIVERED_MAX_AGE_SEC`（既定 3600）以上経過 → `ready` + `leased_until: null`（**non-fixture の delivered は変更しない**）
2. **dedup**: `approval_required|ready|delivered` かつ同一 `cursor_card` は 1 件に。**non-fixture を fixture より優先して残す**
3. **ready 並べ替え**: **連続する `ready` ブロックごとに**、その中だけ non-fixture を先に並べる（API `/next` の「先頭 ready non-fixture」選好と整合）

## Backpressure

- `pending` 件数が `TENMON_QUEUE_PENDING_THRESHOLD`（既定 **3**）を超えると `enqueue_allowed: false` と `blocked_reason` に `pending_queue_count_gt_<N>`
- **non-fixture `delivered` が 1 件でもある**と `nonfixture_delivered_exists` を付与し `enqueue_allowed: false`（従来どおり）

## Summary 出力（`tenmon_continuous_queue_dedup_and_backpressure_summary.json`）

| フィールド | 意味 |
|------------|------|
| `queue_changed` | キュー JSON を書き換えたか |
| `duplicates_removed` | 除去した重複 pending の件数 |
| `removed_duplicate_pending_ids` | 除去した id 一覧（互換） |
| `fixture_drained` | delivered→ready に戻した fixture 件数 |
| `enqueue_allowed` | 上記 backpressure ルールを満たすか |

標準出力の 1 行 JSON にも `queue_changed` / `duplicates_removed` / `fixture_drained` / `enqueue_allowed` を含む。

## nextOnPass

`TENMON_SAFE_STOP_HUMAN_OVERRIDE_AND_FAIL_CLOSED_CURSOR_AUTO_V1`

## nextOnFail

停止。queue retry 1 枚のみ生成。
