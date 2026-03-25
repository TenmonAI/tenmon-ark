# TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT_CURSOR_AUTO_V1

## 目的

基盤〜 learning までを一括観測し、**code-present / runtime-proven / accepted-complete** を裁断した **単一マスターレポート** を生成する（**修復カードではない**）。

## D

- **観測専用**・product 大規模変更禁止
- 出力: **単一 JSON + 単一 Markdown + priority queue + blockers_by_system**
- ログ束（既定は **実行カード**）: `/var/log/tenmon/card_TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT_EXECUTION_CURSOR_AUTO_V1/<TS>/`（`TENMON_MASTER_FORENSIC_CARD` で変更可）
- `exit`: 既定 **0**（レポート生成成功）。**`--strict`** で `pass=false` なら **1**

## 成果物

| ファイル | 役割 |
|----------|------|
| `api/automation/tenmon_total_completion_master_report.json` | 単一真実源 |
| `api/automation/tenmon_total_completion_master_report.md` | 人間可読 |
| `api/automation/tenmon_total_completion_master_priority_queue.json` | 優先度 queue |
| `api/automation/tenmon_total_completion_master_blockers_by_system.json` | 系統別 block map |

## 実行

```bash
bash api/scripts/tenmon_total_completion_master_forensic_report_v1.sh --stdout-json
```

ログを `/var/log/tenmon` 以外へ:

```bash
TENMON_MASTER_FORENSIC_LOG_ROOT=/tmp/tenmon_logs \
  bash api/scripts/tenmon_total_completion_master_forensic_report_v1.sh
```

CI で sealed 相当まで要求:

```bash
bash api/scripts/tenmon_total_completion_master_forensic_report_v1.sh --strict
```

## FAIL_NEXT

`TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT_RETRY_CURSOR_AUTO_V1`
