# TENMON_REMOTE_CURSOR_COMMAND_CENTER_CURSOR_AUTO_V1

## 目的

管理者専用の **Remote Cursor Command Center**：ダッシュボード投入 → job 正規化 → queue guard → Mac エージェント → 結果回収 → seal。

## 管理者 route（`/api`・founder 認証）

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/admin/cursor/queue` | キュー一覧 |
| POST | `/admin/cursor/submit` | カード投入 |
| POST | `/admin/cursor/approve` / `reject` | 承認・却下 |
| GET | `/admin/cursor/next` | エージェント pull（ready→delivered） |
| POST | `/admin/cursor/release` | リース解放 |
| POST | `/admin/cursor/result` | 結果 ingest |
| GET | `/admin/cursor/result/bundle` | バンドル参照 |
| GET | `/admin/cursor/dashboard` | 簡易 HTML |

別系統: `/admin/remote-intake/*`（PARENT_06 遠隔投入・`remote_admin_queue.json`）。

## Job state（正規）

`approval_required` → `ready` → `delivered`（next 取得後）→ `executed`（結果 POST 成功） / 失敗時 `ready` にロールバック。`rejected` は却下。

後方互換: ファイル上の `in_progress` / `done` は読み込み時に `delivered` / `executed` に正規化。

## automation 成果物

| ファイル | 説明 |
|----------|------|
| `remote_cursor_queue.json` | キュー |
| `remote_cursor_guard_report.json` | queue guard（高リスクパターン） |
| `remote_cursor_result_bundle.json` | ingest（`schema_version`, `touched_files`, `build_result`, `acceptance_result`, `next_card`） |
| `remote_cursor_mac_agent_manifest.json` | Mac エージェント用エンドポイント一覧 |
| `remote_cursor_command_center_seal.json` | 司令塔 seal |

VPS bundle 複製: `api/automation/out/tenmon_remote_cursor_command_center_v1/`（`remote_cursor_command_center_v1.py`）

## Seal 条件（`overall_ok`）

- `remote_cursor_queue.json` が version + items 配列を持つ
- `remote_cursor_result_bundle.json` が version + entries 配列を持つ
- `remote_cursor_guard_report.json` の **flagged が空**

## シェル

- `api/scripts/remote_cursor_agent_mac_v1.sh` — pull + inbox
- `api/scripts/remote_cursor_submit_v1.sh` — カード投入

## 一括

```bash
cd api/automation
python3 remote_cursor_command_center_v1.py --stdout-json
```

## FAIL_NEXT

`TENMON_REMOTE_CURSOR_COMMAND_CENTER_CURSOR_AUTO_RETRY_V1`

## DO_NOT_TOUCH

`dist/**`、`chat.ts` 会話本体、一般ユーザー route、DB schema 大変更、kokuzo_pages 正文、`/api/chat` 契約、systemd env（本カード範囲外の無差別変更禁止）。
