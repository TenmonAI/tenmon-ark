# TENMON_MAC_EXECUTOR_BEARER_RUNTIME_BIND_CURSOR_AUTO_V1

## 目的

`GET /api/admin/cursor/next` を Mac executor がそのまま処理できる **manifest 返却**にし、`Authorization: Bearer`（Founder executor JWT）など既存認証を維持したまま current-run を実運転可能にする。

## 認証

- `requireFounderOrExecutorBearer`（`executorTokenV1.ts`）を変更しない。`GET /queue` / `GET /next` とも同一ガード。

## `GET /api/admin/cursor/queue`

- 既存の summary / items 形は維持（本カードでは変更しない）。

## `GET /api/admin/cursor/next`

### リース

- 従来どおり: 選択した `ready` アイテムを `delivered` にし、`leased_until` を更新（15 分）。

### 選択優先度

- `?dry_run_only=1`: `dry_run_only === true` の ready のみ（従来どおり）。
- それ以外: **`dry_run_only` を除外**し、キュー順で先頭の実ジョブを取得（非 fixture 優先）。

### 返却 JSON（成功時）

`state` はリース後の実値（通常 `delivered`）。例:

```json
{
  "ok": true,
  "item": {
    "job_id": "...",
    "id": "...",
    "state": "delivered",
    "createdAt": "...",
    "source": "...",
    "cursor_card": "...",
    "card_name": "...",
    "objective": "...",
    "job_file": "api/automation/out/remote_cursor_executor/<job_id>/job.json",
    "fixture": false,
    "leased_until": "...",
    "card_body_md": "..."
  }
}
```

- `objective`: 本文先頭の `OBJECTIVE=` / `OBJECTIVE:` 行があればその値、なければ本文先頭抜粋。
- `fixture`: `dry_run_only` と同義（高リスク dry-run ジョブの識別用）。
- `job_file`: 実行側が成果物・メタを置く**推奨相対パス**（API はファイルを自動生成しない）。
- `id`: 既存クライアント互換（`job_id` と同一）。

### 空キュー

```json
{ "ok": true, "item": null, "message": "no ready items" }
```

## NON-NEGOTIABLES

- fixture 成功の捏造なし（キュー外の偽 job を返さない）。
- `dist/` 直編集禁止。

## NEXT

`TENMON_MAC_EXECUTOR_BEARER_RUNTIME_BIND` 以降の Mac 側バインド・E2E。

*Version: 1*
