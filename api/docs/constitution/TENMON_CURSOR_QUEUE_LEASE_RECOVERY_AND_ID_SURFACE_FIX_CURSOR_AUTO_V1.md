# TENMON_CURSOR_QUEUE_LEASE_RECOVERY_AND_ID_SURFACE_FIX_CURSOR_AUTO_V1

## 目的

期限切れ `delivered` の自動 `ready` 復帰、`/queue` での id 表面化、`/release` が **id / queue_id / job_id（本文ラベル）** のいずれでもヒットするようにし、Mac Bearer 運用で `next → release → next` が通るようにする。

## A. 期限切れ delivered の自動回復

`reconcileExpiredDeliveredLeases`（`/queue`・`/next`・`/release` 前で実行）:

```text
delivered && leased_until あり && Date.parse(leased_until) > 0 && lease <= now
→ state = ready, leased_until = null
```

`leased_until` が無い `delivered` は対象外（仕様どおり）。

## B. GET `/queue` の各 item

既存フィールドに加え（スプレッド後に上書き）:

- **`queue_id`**: キュー主キー（`id` と同値）
- **`job_id`**: カード本文から抽出した運用ラベル（`RUN_ID=` / `JOB_ID=` / `probe_job_*` 等）。無ければ **`null`**
- **`lease_reconciled`**: レスポンストップレベル（当該リクエストで復旧した件数）

## C. GET `/next` の manifest（互換維持 + 追加）

- **`id` / `queue_id` / `job_id`**: API・`POST /result` 用の **キュー id（hex）** は従来どおり `job_id` と `id` に保持（既存クライアント互換）
- **`run_job_id`**: 本文由来ラベル（無ければ省略でよいが実装は `null` 可）

## D. POST `/release`

body は次を**別キー**で受理（**探索順: `id` → `queue_id` → `job_id`**）:

- `{ "id": "..." }`
- `{ "queue_id": "..." }`（値はキュー id）
- `{ "job_id": "..." }`（本文ラベル **または** キュー id と一致する hex）

一致した item: **`executed` / `rejected` 以外**は `state = ready`, `leased_until = null` を設定して保存。レスポンスの `item` は `/queue` と同形（`augmentQueueItemForApi`）。

404:

```json
{
  "ok": false,
  "error": "not found",
  "hint": "Use item.id / queue_id from GET /queue. probe_job_* is usually job_id, not queue id."
}
```

`approve` / `reject` も同一の `findQueueItem` 探索順を使用。

## NON-NEGOTIABLES

- `requireFounderOrExecutorBearer` を壊さない
- 偽ジョブ注入なし、`dist/` 直編集禁止

*Version: 2*
