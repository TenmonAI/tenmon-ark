# TENMON_CURSOR_NEXT_NONFIXTURE_PRIORITY_AND_MANIFEST_COMPLETION_CURSOR_AUTO_V1

## 目的

`GET /api/admin/cursor/next` が fixture を実ジョブより先に返す残差を解消し、`objective` の空文字や `job_file` の取りこぼしを減らして Mac executor が non-fixture をそのまま処理できる manifest を返す。

## 挙動

### non-fixture 優先

- `?dry_run_only=1` のとき: **fixture のみ**（`dry_run_only` または `fixture` が真とみなす項目）をキュー順で返す。
- それ以外: **fixture でない** ready 項目をキュー順で優先。無い場合のみ fixture を返す。

`fixture` 判定: `dry_run_only === true`、またはキュー JSON の `fixture` が真（boolean / `1` / `"true"` 等。`readQueue` で `dry_run_only` は正規化）。

### objective（空禁止）

優先順:

1. キュー項目の `objective`
2. `card_body_md` 内 `OBJECTIVE=` / `OBJECTIVE:`
3. 本文先頭 500 文字（trim 後）
4. `source` + `cursor_card` からの最小補完文

### job_file

1. キュー項目の `job_file`（非空ならそのまま）
2. `executorJobFileRel(id)`
3. 無ければ `null`

### manifest 最低フィールド

`id`, `queue_id`, `job_id`, `run_job_id`, `state`, `source`, `cursor_card`, `objective`, `job_file`, `fixture`, `leased_until` に加え、互換のため `createdAt`, `card_name`, `card_body_md` を返却。

## NON-NEGOTIABLES

- Founder executor Bearer 認証・`/queue` 契約・リース復帰ロジックを壊さない
- 成功の捏造なし
- `dist/` 直編集禁止

*Version: 1*
