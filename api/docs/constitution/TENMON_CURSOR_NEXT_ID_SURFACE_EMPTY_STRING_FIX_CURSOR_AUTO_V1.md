# TENMON_CURSOR_NEXT_ID_SURFACE_EMPTY_STRING_FIX_CURSOR_AUTO_V1

## 目的

`/api/admin/cursor/next`（およびキュー読み込み経路）で、`id` / `queue_id` / `job_id` 表面が空文字になり Mac 側の result / release / 再取得ができない問題を防ぐ。

## 挙動

`readQueue()` ですべての項目に対して `repairQueueItemSurfaceId` を実行する。

1. `id` が非空（trim 後）なら、前後空白のみ正規化し、変更があればキューを書き戻し。
2. `id` が空なら、JSON の **`queue_id`** 列（同一オブジェクト上のプロパティ）が非空ならそれを **`id` に昇格**。
3. それでも無いなら **`randomBytes(8).toString("hex")`** を `id` に割り当て。

変更があった場合は **`writeQueue`** で `remote_cursor_queue.json` を更新する（捏造成功ではなく、識別子の修復）。

`buildNextManifestPayload` は防御的に、まだ空のときだけ同じ修復をかけたうえで `id` / `queue_id` / `job_id` を **同一の非空 `id`** で返す（`/next` 応答直前の `writeQueue` で永続化される）。

## NON-NEGOTIABLES

- Bearer 認証・`/queue` / `/next` の既存成功経路を維持
- 空文字の `id` / `queue_id` / `job_id` を返さない
- `dist/` 直編集禁止

*Version: 1*
