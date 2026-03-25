# TENMON_REMOTE_BUILD_JOB_NORMALIZER_CURSOR_AUTO_V1

## 目的

管理者ダッシュボードから届いた **生の Cursor カード本文** を、Mac 側へ渡す **single source の正規化 manifest** に変換する（**実行層・Cursor 層は変更しない**）。

## 正規化フィールド

| フィールド | 説明 |
|------------|------|
| `job_id` | ジョブ ID |
| `card_name` | `CARD_NAME:` または引数 |
| `objective` | `OBJECTIVE:` セクション（欠損時は本文先頭から補完） |
| `files` / `edit_scope` | `FILES` / `EDIT_SCOPE` リスト（欠損時は既定 glob） |
| `do_not_touch` | `DO_NOT_TOUCH`（欠損時は既定） |
| `acceptance` | `ACCEPTANCE`（欠損時は既定） |
| `fail_next_card` | `FAIL_NEXT` / `FAIL_NEXT_CARD`（欠損時はリトライカード名） |
| `execution_mode` | `dry_run` / `apply` / `manual`（既定 `manual`） |
| `safety_flags` | 危険パターン検出・reject 理由・補完一覧 |

## 危険パターン（reject）

例: `rm -rf /`、`dist/` 編集指示、秘密鍵露出、`ALTER TABLE`、kokuzo 正文、systemd 等。該当時は `safety_flags.rejected: true`。`execution_mode` が `apply` でも reject 時は `dry_run` に落とす記録を付与。

## 実装

| 種別 | パス |
|------|------|
| スキーマ | `api/automation/remote_build_job_schema_v1.json` |
| 正規化器 | `api/automation/remote_build_job_normalizer_v1.py` |

## CLI

```bash
cd /opt/tenmon-ark-repo/api
# 単発
python3 automation/remote_build_job_normalizer_v1.py \
  --card-name "MY_CARD_V1" \
  --card-body-file path/to/card.md \
  --out automation/out/normalized_remote_build_manifest.json

# stdout のみ
python3 automation/remote_build_job_normalizer_v1.py --card-body "OBJECTIVE:\n..." --stdout-json
```

## VPS 検証

```bash
bash api/src/scripts/tenmon_remote_build_job_normalizer_vps_v1.sh
```

成果物:

- `api/automation/TENMON_REMOTE_BUILD_JOB_NORMALIZER_VPS_V1`（マーカー）
- `api/automation/out/normalized_remote_build_manifest.json`（代表例）
- `api/automation/out/normalization_accept_cases.json`
- `api/automation/out/normalization_reject_cases.json`

## 次工程（配送）

正規化 manifest の VPS→Mac 配送: `TENMON_MAC_REMOTE_BRIDGE_CURSOR_AUTO_V1`（`mac_remote_bridge_v1.py` / `remote_bridge_protocol_v1.md`）。

## FAIL 次カード

- `TENMON_REMOTE_BUILD_JOB_NORMALIZER_RETRY_CURSOR_AUTO_V1`
