# TENMON_PWA_LIVED_COMPLETION_SEAL_CURSOR_AUTO_V1

## 目的

**実PWA/API を単一真実源**とし、lived completion を監査して **surface completion を封印**する（PASS のときのみ seal 可）。

## D

- 実PWA / 実API 基準（本 runner は **HTTP 観測**）
- 既存 backend 正常前提
- frontend last-mile は別カード；本カードは **lived 監査・封印**
- **PASS 以外は seal 禁止**
- blocker は JSON（`pwa_lived_completion_blockers.json`）
- FAIL 時は next PDCA MD を自動生成

## 観測

| 項目 | 内容 |
|------|------|
| Gates | `GET /health`, `GET /api/audit`, `GET /api/audit.build` |
| Chat | `POST /api/chat` representative（threadId 付与） |
| threadId | 応答に `threadId` が存在し、要求と一致すること |
| refresh 相当 | **同一 threadId** で 2 回目リクエストが非空応答 |
| new chat | **新 threadId** で応答・threadId 一致 |
| continuity | seed ターン + followup 同一 threadId |
| surface | meta leak / 重複行 / route 定数字面 などのヒューリスティク |

## 出力（`api/automation/`）

| ファイル | 説明 |
|----------|------|
| `pwa_lived_completion_seal_report.json` | 全トレース |
| `pwa_lived_completion_readiness.json` | フラグ + `final_ready` |
| `pwa_lived_completion_blockers.json` | blocker 配列 |
| `generated_cursor_apply/TENMON_PWA_LIVED_FAIL_NEXT_PDCA_AUTO_V1.md` | FAIL 時 |
| `generated_cursor_apply/TENMON_PWA_LIVED_COMPLETION_SEAL_PASS_V1.md` | **PASS 時のみ** |

## `final_ready`

次をすべて満たすとき `true`：

- `health_ok` / `audit_ok` / `audit_build_ok`
- `thread_id_presence_ok` / `url_sync_readiness`（要求・応答 threadId 一致）
- `refresh_restore_readiness` / `new_chat_readiness` / `continuity_readiness`
- `surface_meta_duplicate_bleed_clean`

## 実行

リポジトリルートから:

```bash
bash api/scripts/tenmon_pwa_lived_completion_seal_v1.sh --stdout-json
```

環境: `CHAT_TS_PROBE_BASE_URL`（既定 `http://127.0.0.1:3000`）。

ログ束: `/var/log/tenmon/card_TENMON_PWA_LIVED_COMPLETION_SEAL_V1/<TS>/`
