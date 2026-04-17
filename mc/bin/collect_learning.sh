#!/bin/bash
# ============================================================
# TENMON-MC §5: 学習機能
# 出力: JSON (stdout)
#
# 実テーブル: tenmon_audit_log, tenmon_training_log,
#             scripture_learning_ledger, kanagi_growth_ledger,
#             evolution_ledger_v1, khs_apply_log, synapse_log
# ============================================================
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

if [ ! -f "$DB_PATH" ]; then
  cat <<JSON
{
  "section": "learning",
  "error": "db not found at ${DB_PATH}"
}
JSON
  exit 0
fi

# 学習系テーブルの存在確認
LEARN_TABLES=$(sql_ro "SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%train%' OR name LIKE '%audit%' OR name LIKE '%golden%' OR name LIKE '%reflect%' OR name LIKE '%learning%' OR name LIKE '%growth%' OR name LIKE '%evolution%' OR name LIKE '%synapse%');" | tr '\n' ',' | sed 's/,$//')

# Self-Audit の24時間実行回数 (tenmon_audit_log)
AUDIT_24H=$(sql_ro "SELECT COUNT(*) FROM tenmon_audit_log WHERE createdAt > datetime('now', '-24 hours');")

# 最終audit実行
LAST_AUDIT=$(sql_ro "SELECT MAX(createdAt) FROM tenmon_audit_log;")

# トレーニングログの24時間
TRAINING_24H=$(sql_ro "SELECT COUNT(*) FROM tenmon_training_log WHERE createdAt > datetime('now', '-24 hours');")

# 経典学習の24時間
SCRIPTURE_24H=$(sql_ro "SELECT COUNT(*) FROM scripture_learning_ledger WHERE createdAt > datetime('now', '-24 hours');")

# 成長記録の24時間
GROWTH_24H=$(sql_ro "SELECT COUNT(*) FROM kanagi_growth_ledger WHERE created_at > datetime('now', '-24 hours');")

# Synapse ログの24時間
SYNAPSE_24H=$(sql_ro "SELECT COUNT(*) FROM synapse_log WHERE createdAt > datetime('now', '-24 hours');")

# KHS Apply ログの24時間
KHS_APPLY_24H=$(sql_ro "SELECT COUNT(*) FROM khs_apply_log WHERE createdAt > datetime('now', '-24 hours');")

# Evolution ledger の24時間
EVOLUTION_24H=$(sql_ro "SELECT COUNT(*) FROM evolution_ledger_v1 WHERE createdAt > datetime('now', '-24 hours');")

cat <<JSON
{
  "section": "learning",
  "learning_tables": "$(json_escape "$LEARN_TABLES")",
  "self_audit_count_24h": $(ensure_num "$AUDIT_24H"),
  "last_audit_timestamp": "$(json_escape "$LAST_AUDIT")",
  "training_count_24h": $(ensure_num "$TRAINING_24H"),
  "scripture_learning_24h": $(ensure_num "$SCRIPTURE_24H"),
  "growth_ledger_24h": $(ensure_num "$GROWTH_24H"),
  "synapse_log_24h": $(ensure_num "$SYNAPSE_24H"),
  "khs_apply_log_24h": $(ensure_num "$KHS_APPLY_24H"),
  "evolution_ledger_24h": $(ensure_num "$EVOLUTION_24H")
}
JSON
