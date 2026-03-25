# CHAT_TS_RUNTIME_ACCEPTANCE_AND_WORLDCLASS_SEAL_V1

## 目的

VPS で **build → restart → health 探索 → audit → chat URL 探索 → runtime probe マトリクス → worldclass レポート** を一束にし、`chat_ts_overall_100` を正しく出す。

## リポジトリ内の実装

| 要素 | パス |
|------|------|
| レポート + マトリクス | `api/automation/tenmon_chat_ts_worldclass_completion_report_v1.py` |
| probe 文言（canon） | `api/automation/chat_ts_probe_canon_v1.json` |
| シール実行スクリプト | `api/scripts/chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh` |
| Stage5 merge | `api/scripts/chat_ts_stage5_verdict_merge_v1.py` → `final_verdict.json` / `seal_verdict.json` / `SEAL_VERDICT_JSON=` |
| exit contract 回帰ガード | `api/docs/constitution/CHAT_TS_EXIT_CONTRACT_SEAL_AND_REGRESSION_GUARD_V1.md` |
| 未達時次カード | `api/automation/generated_cursor_apply/CHAT_TS_RUNTIME_NEXT_PDCA_AUTO_V1.md`（`--write-next-pdca`） |

## 環境変数

- `CHAT_TS_PROBE_BASE_URL` — API オリジン（必須でマトリクス実行）
- `CHAT_TS_PROBE_CHAT_URL` — POST 先（省略時 `/chat` と `/api/chat` を試行）
- `TENMON_API_BASE` / `SEAL_LOG_DIR` / `ROOT` — シールスクリプト用

## Audit

- 正: `GET /api/audit`
- `GET /api/audit.build` は未定義のため 404 になり得る（`audit_build` は観測のみ）

## Non-Negotiables

カード本文（憶測禁止・最小diff・dist 直編集禁止・ku object・GROUNDED 捏造禁止 等）に従う。
