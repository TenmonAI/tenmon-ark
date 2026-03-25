# TENMON_CURSOR_QUEUE_API_SURFACE_NORMALIZATION_CURSOR_AUTO_V1

## 目的

`GET /api/admin/cursor/queue` と `GET /api/admin/cursor/next` の item 表面を揃え、主キー・ジョブ識別子・fixture の意味が一覧と manifest で一致するようにする。

## 主キー

- **`id`** / **`queue_id`**: 常に同一（trim 済みのキュー行 id）。

## `job_id`（API 互換・常に辿りやすい識別子）

優先順（空文字は出さない。最終手段まで無ければ `null`）:

1. キュー JSON の **`job_id`**（trim 非空）
2. 本文ラベル（`RUN_ID=` / `JOB_ID=` / `job_id=` / `probe_job_*`）
3. **`id`**（キュー主キー）

## `run_job_id`

- 本文から取れたラベルのみ（無ければ **`null`**）。
- 人間向け「run ラベル」。`probe_job_*` はここに載ることが多い。

## `fixture`

- 常に **`isFixtureItem(it)`**（`dry_run_only` と JSON の `fixture` フラグの合成判定）。返却 JSON の `fixture` は raw の `fixture` キーを上書きする。

## `dry_run_only`

- キュー行の真偽値をそのまま返す（`/next` manifest にも含める）。

## lookup（release / result）

`findQueueItem` の `job_id` 照合は、上記 **`resolveSurfaceJobId`** 結果・本文ラベル・`id` のいずれか一致でヒットする。

## NON-NEGOTIABLES

- Founder executor Bearer・既存成功経路を壊さない
- success 捏造なし
- `dist/` 直編集禁止

*Version: 1*
