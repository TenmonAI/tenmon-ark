# TENMON_ADMIN_REMOTE_BUILD_DASHBOARD_CURSOR_AUTO_V1

## 目的

管理者が **一般チャットと分離** した経路から、Cursor 自動構築カードを投入し、**ジョブキュー登録・可視化** までを行う（**実行そのものは別工程**）。

## 入力

| フィールド | 説明 |
|------------|------|
| `cardName` | カード名（例: `TENMON_..._CURSOR_AUTO_V1`） |
| `cardBodyMd` | Cursor カード本文（Markdown） |
| `priority` | `low` / `normal` / `high` |
| `targetScope` | 編集対象の範囲・パス目安 |
| `notes` | 任意メモ |

## API（すべて founder 認可必須）

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/admin/remote-build/dashboard` | 最小 HTML ダッシュボード |
| POST | `/api/admin/remote-build/jobs` | ジョブ登録 + manifest 生成 |
| GET | `/api/admin/remote-build/jobs` | 一覧 |
| GET | `/api/admin/remote-build/jobs/:id` | 1 件 |
| POST | `/api/admin/remote-build/jobs/:id/rollback` | rollback 指示（状態のみ） |
| POST | `/api/admin/remote-build/guard-check` | `guardRemoteCursorPayload` のみ |
| GET | `/api/admin/remote-build/vps-snapshot` | manifest 再出力 |

認可: `Cookie: tenmon_founder=1` または `X-Founder-Key: $FOUNDER_KEY`

## ストレージ（DB スキーマ変更なし）

- 既定: `data/remote_build_jobs.json`
- 環境: `TENMON_REMOTE_BUILD_JOBS_PATH` / `TENMON_REMOTE_BUILD_DATA_DIR`

## 成果物（automation）

- `api/automation/remote_build_dashboard_manifest.json` — キュー要約
- `api/automation/out/remote_build_job_submit_result.json` — 最終 POST 応答の写し
- `api/automation/out/admin_guard_check.json` — `guard-check` の写し
- `api/automation/TENMON_ADMIN_REMOTE_BUILD_DASHBOARD_VPS_V1` — マーカー（API 操作時に更新）

## VPS 検証

```bash
chmod +x api/src/scripts/tenmon_admin_remote_build_dashboard_vps_v1.sh
export FOUNDER_KEY=...
bash api/src/scripts/tenmon_admin_remote_build_dashboard_vps_v1.sh
```

## 実装

- `api/src/routes/adminRemoteBuild.ts`
- `api/src/founder/remoteBuildJobManifestV1.ts`
- `api/src/founder/remoteCursorGuardV1.ts`（ガード）
- 正規化（Mac 向け single source）: `api/automation/remote_build_job_normalizer_v1.py`（`TENMON_REMOTE_BUILD_JOB_NORMALIZER_CURSOR_AUTO_V1`）

## FAIL 次カード

- `TENMON_ADMIN_REMOTE_BUILD_DASHBOARD_RETRY_CURSOR_AUTO_V1`
