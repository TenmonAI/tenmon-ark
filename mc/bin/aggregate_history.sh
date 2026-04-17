#!/bin/bash
# ============================================================
# TENMON-MC Phase 3: snapshot.json → history.db 蓄積
# collect.sh 実行後に呼ばれる
# ============================================================
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

HISTORY_DB="/var/www/tenmon-mc/history.db"
SNAPSHOT="${DATA_DIR}/snapshot.json"

if [ ! -f "$SNAPSHOT" ] || [ ! -f "$HISTORY_DB" ]; then
  exit 0
fi

TIMESTAMP=$(jq -r '.generated_at_utc' "$SNAPSHOT")

# 記録する数値メトリクス一覧
declare -A METRICS
METRICS["infra.cpu_pct"]="number"
METRICS["infra.mem_used_mb"]="number"
METRICS["infra.disk_pct"]="number"
METRICS["infra.error_count_24h"]="number"
METRICS["sukuyou.lookup_table_entries"]="number"
METRICS["sukuyou.deep_data_shuku_count"]="number"
METRICS["kotodama.chat_ts_references"]="number"
METRICS["kotodama.fire_water_in_logs_24h"]="number"
METRICS["founder.total_users"]="number"
METRICS["founder.active_last_7days"]="number"
METRICS["founder.total_kantei"]="number"
METRICS["learning.self_audit_count_24h"]="number"
METRICS["learning.synapse_log_24h"]="number"
METRICS["learning.growth_ledger_24h"]="number"
METRICS["learning.evolution_ledger_24h"]="number"
METRICS["llm_routing.total_synapse_24h"]="number"
METRICS["llm_routing.deep_reports_24h"]="number"
METRICS["dialogue_quality.avg_response_length_24h"]="number"
METRICS["dialogue_quality.longform_count_24h"]="number"
METRICS["persona_system.active_personas"]="number"
METRICS["sacred_corpus.total_corpus_registered"]="number"
METRICS["user_feedback.feedback_last_7days"]="number"

# バッチ挿入用SQL組み立て
SQL_INSERTS=""
for key in "${!METRICS[@]}"; do
  SECTION="${key%%.*}"
  METRIC_KEY="${key#*.}"
  VALUE=$(jq -r ".sections.${SECTION}.${METRIC_KEY} // 0" "$SNAPSHOT" | tr -d '"')
  TYPE="${METRICS[$key]}"
  
  SQL_INSERTS+="INSERT INTO snapshots (timestamp, section, metric_key, metric_value, metric_type) VALUES ('${TIMESTAMP}', '${SECTION}', '${METRIC_KEY}', '${VALUE}', '${TYPE}');"
done

sqlite3 "$HISTORY_DB" "$SQL_INSERTS"

# 30日以上前のデータは削除
sqlite3 "$HISTORY_DB" "DELETE FROM snapshots WHERE timestamp < datetime('now', '-30 days');"

exit 0
