# TENMON_REMOTE_BUILD_RESULT_COLLECTOR_CURSOR_AUTO_V1

## 目的

Mac 上の Cursor / build 実行結果を **TENMON-ARK（VPS）側へ返送**し、`build` / `diff` / `acceptance` / ログを **1 つの result bundle** に束ねて保存する（PDCA 完了用）。

## 成果物（VPS）

| ファイル | 内容 |
|----------|------|
| `remote_build_result_bundle.json` | 取り込み済み束（分類・ingested_at 付き） |
| `acceptance_summary.json` | acceptance 要約 |
| `collected_diff_summary.json` | diff 要約 |
| `remote_build_result_schema_v1.json` | スキーマ |

## Mac: パッケージャ

```bash
bash api/automation/mac_result_packager_v1.sh /path/to/tenmon-ark-repo <JOB_ID> [cursor_session.log] > /tmp/bundle.json
```

任意: `BUILD_LOG_PATH=/path/to/build.log` で build tail を含める。

## VPS: 取り込み

**CLI**

```bash
python3 api/automation/remote_build_result_collector_v1.py --ingest-file /tmp/bundle.json
```

**HTTP（founder 必須）**

`POST /api/admin/remote-build/result-ingest` — body に bundle JSON。

## job 状態

`remote_build_jobs.json` の該当 `jobId` に `result.status` を付与: `accepted` | `failed` | `needs_review` | `executed`（ヒューリスティクス）。

## VPS 検証

```bash
bash api/src/scripts/tenmon_remote_build_result_collector_vps_v1.sh
```

## 次工程（裁定）

`TENMON_REMOTE_BUILD_SEAL_AND_ROLLBACK_CURSOR_AUTO_V1`（`remote_build_seal_governor_v1.py`）で sealed / rollback / retry / blocked を一意に決定。

## FAIL 次カード

- `TENMON_REMOTE_BUILD_RESULT_COLLECTOR_RETRY_CURSOR_AUTO_V1`
