# TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT_EXECUTION_CURSOR_AUTO_V1

## 目的

`TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT_CURSOR_AUTO_V1` の **runner 内観測** と **最終 JSON 契約** を固定し、Cursor からそのまま実行できる **観測実行カード** とする（修復ではない）。

## D

- 観測専用・product 大規模変更禁止
- **観測項目は省略禁止**（shell に埋め込み済み）
- JSON 出力形式固定: `systems` / `top_10_blockers` / `priority_top_cards` / `next_single_best_card`
- ログ束: `/var/log/tenmon/card_TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT_EXECUTION_CURSOR_AUTO_V1/<TS>/`
- `exit != 0` でも **LOG_DIR に証拠束を残す**

## Runner

- `api/scripts/tenmon_total_completion_master_forensic_report_v1.sh`
- 既定 `CARD=TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT_EXECUTION_CURSOR_AUTO_V1`（`TENMON_MASTER_FORENSIC_CARD` で上書き可）
- 埋め込みブロック: **GIT → RUNTIME GATES → TOOLCHAIN → CHAT (curl) → FRONTEND grep** → snapshots → `tenmon_total_completion_master_report_v1.py --prefer-shell-observations`

## Integrator

- `api/automation/tenmon_total_completion_master_report_v1.py`
- shell の `chat_probe_curl_*.json` / `frontend_grep_*.txt` を読み、`chat_probe` / `frontend_residue_runner_grep` に統合

## 出力

- `api/automation/tenmon_total_completion_master_report.json`（`systems` + `subsystems` 同一）
- ほか `.md` / `priority_queue` / `blockers_by_system`

## 実行

```bash
bash api/scripts/tenmon_total_completion_master_forensic_report_v1.sh --stdout-json
```
