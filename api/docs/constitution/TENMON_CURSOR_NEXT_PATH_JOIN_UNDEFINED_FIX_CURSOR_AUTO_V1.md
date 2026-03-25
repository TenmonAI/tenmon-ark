# TENMON_CURSOR_NEXT_PATH_JOIN_UNDEFINED_FIX_CURSOR_AUTO_V1

## 目的

`GET /api/admin/cursor/next` が `buildNextManifestPayload` → `executorJobFileRel` で `path.join` / `path.posix.join` に **undefined** が渡り `ERR_INVALID_ARG_TYPE` となる問題を防ぎ、manifest を安定返却する。

## 根本原因

キュー JSON の項目に **`id` 欠損**（手編集・旧データ・壊れた行）があると `it.id` が `undefined` になり、`path.posix.join(..., undefined, ...)` で Node が例外を投げる。

## 修正

`executorJobFileRel(queueId, baseDir?)`:

- `queueId` / `baseDir` を `String(...).trim()` で正規化
- **いずれかが空**なら **`null`** を返す（join を呼ばない）
- 既定の相対ベースは `api/automation/out/remote_cursor_executor`（従来どおり）

`buildNextManifestPayload` の **`job_file`** は `string | null`（欠損時 `null`）。

## NON-NEGOTIABLES

- Bearer 認証・`/queue` / `/next` の他フィールド契約は維持（本変更は防御のみ）
- 偽ジョブ・成功捏造なし
- `dist/` 直編集禁止（ソース修正後にビルド）

*Version: 1*
