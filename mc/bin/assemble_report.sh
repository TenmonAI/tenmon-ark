#!/bin/bash
# ============================================================
# TENMON-MC テキストレポート組み立て
# snapshot.json を読んで整形されたテキストを出力
# ============================================================
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

SNAPSHOT="${DATA_DIR}/snapshot.json"

if [ ! -f "$SNAPSHOT" ]; then
  echo "Error: snapshot.json not found at ${SNAPSHOT}"
  exit 1
fi

JST_TIME=$(jq -r '.generated_at_jst' "$SNAPSHOT")

cat <<EOF
============================================================
  TENMON-ARK Mission Control / Phase 1 MVP
  Snapshot: ${JST_TIME}
============================================================

EOF

echo "┌─ §1 INFRA ────────────────────────────────────────────────"

jq -r '.sections.infra |
  "│ systemd:           \(.systemd_state)\n" +
  "│ API health (HTTP): \(.api_health_http_code)\n" +
  "│ CPU:               \(.cpu_pct)%\n" +
  "│ Memory:            \(.mem_used_mb) / \(.mem_total_mb) MB\n" +
  "│ Disk:              \(.disk_pct)%\n" +
  "│ Errors (24h):      \(.error_count_24h)\n" +
  "│ Uptime:            \(.uptime)"' "$SNAPSHOT" 2>/dev/null || echo "│ [ERROR] infra section parse failed"

echo "└───────────────────────────────────────────────────────────"
echo ""
echo "┌─ §2 SUKUYOU 宿曜鑑定品質 ─────────────────────────────────"

jq -r '.sections.sukuyou |
  "│ Golden sample(\(.golden_sample_birthdate)): \(.golden_sample_result)宿\n" +
  "│   期待: \(.golden_sample_expected)宿  PASS=\(.golden_sample_pass)\n" +
  "│ Lookup Table エントリ:   \(.lookup_table_entries)\n" +
  "│ 深化データ実装宿数:     \(.deep_data_shuku_count) / 27\n" +
  "│ 深化データカバー率:     \(.deep_data_coverage_pct)%"' "$SNAPSHOT" 2>/dev/null || echo "│ [ERROR] sukuyou section parse failed"

echo "└───────────────────────────────────────────────────────────"
echo ""
echo "┌─ §3 KOTODAMA 言霊連携 ────────────────────────────────────"

jq -r '.sections.kotodama |
  "│ chat.ts 内 参照数:       \(.chat_ts_references)\n" +
  "│ ログ内 水火 (24h):       \(.fire_water_in_logs_24h)\n" +
  "│ kotodama fire (24h):     \(.kotodama_fire_in_logs_24h)\n" +
  "│ Connector git追跡:       \(if .connector_tracked_in_git == 1 then "YES" else "NO" end)\n" +
  "│ 言霊関連ファイル数:     \(.kotodama_related_files)"' "$SNAPSHOT" 2>/dev/null || echo "│ [ERROR] kotodama section parse failed"

echo "└───────────────────────────────────────────────────────────"
echo ""
echo "┌─ §4 FOUNDER ファウンダー運用 ─────────────────────────────"

jq -r '.sections.founder |
  "│ 総ユーザー数:            \(.total_users)\n" +
  "│ アクティブメンバー:      \(.active_members) / \(.total_members)\n" +
  "│ 7日アクティブ:           \(.active_last_7days)\n" +
  "│ 7日鑑定数:               \(.kantei_count_7days)\n" +
  "│ 総鑑定数:                \(.total_kantei)\n" +
  "│ 宿分布:"' "$SNAPSHOT" 2>/dev/null || echo "│ [ERROR] founder section parse failed"

# 宿分布を見やすく表示
jq -r '.sections.founder.shuku_distribution // {} | to_entries[] | "│   \(.key)宿: \(.value)人"' "$SNAPSHOT" 2>/dev/null

echo "└───────────────────────────────────────────────────────────"
echo ""
echo "┌─ §5 LEARNING 学習機能 ────────────────────────────────────"

jq -r '.sections.learning |
  "│ 学習系テーブル:          \(.learning_tables)\n" +
  "│ Self-Audit 24h:          \(.self_audit_count_24h)\n" +
  "│ 最終Audit:               \(.last_audit_timestamp)\n" +
  "│ Training 24h:            \(.training_count_24h)\n" +
  "│ Scripture Learning 24h:  \(.scripture_learning_24h)\n" +
  "│ Growth Ledger 24h:       \(.growth_ledger_24h)\n" +
  "│ Synapse Log 24h:         \(.synapse_log_24h)\n" +
  "│ KHS Apply 24h:           \(.khs_apply_log_24h)\n" +
  "│ Evolution Ledger 24h:    \(.evolution_ledger_24h)"' "$SNAPSHOT" 2>/dev/null || echo "│ [ERROR] learning section parse failed"

echo "└───────────────────────────────────────────────────────────"
echo ""
echo "┌─ §6 DATA INTEGRITY ───────────────────────────────────────"

jq -r '.sections.data_integrity |
  "│ Git HEAD:                \(.git_head)\n" +
  "│ HEAD message:            \(.git_head_message)\n" +
  "│ HEAD date:               \(.git_head_date)\n" +
  "│ Branch:                  \(.git_branch)\n" +
  "│ Untracked:               \(.untracked_files)\n" +
  "│ Modified:                \(.modified_files)\n" +
  "│ .bak ファイル:           \(.backup_files)\n" +
  "│ Feedback files:          \(.feedback_files)\n" +
  "│ DB size:                 \(.db_file_size)\n" +
  "│ DB tables:               \(.db_table_count)"' "$SNAPSHOT" 2>/dev/null || echo "│ [ERROR] data_integrity section parse failed"

echo "└───────────────────────────────────────────────────────────"
echo ""

# ── ALERTS ──
echo "┌─ ALERTS (Phase 1 Auto-Detected) ──────────────────────"

ALERT_COUNT=0

# 深化データ不足
DEEP_CNT=$(jq -r '.sections.sukuyou.deep_data_shuku_count // 0' "$SNAPSHOT")
if [ "$DEEP_CNT" != "null" ] && [ "$DEEP_CNT" -lt 10 ] 2>/dev/null; then
  echo "│ [HIGH] 深化データ ${DEEP_CNT}/27宿のみ - 鑑定品質に影響大"
  ALERT_COUNT=$((ALERT_COUNT + 1))
fi

# ゴールデンサンプル失敗
GOLDEN_PASS=$(jq -r '.sections.sukuyou.golden_sample_pass // false' "$SNAPSHOT")
if [ "$GOLDEN_PASS" != "true" ]; then
  echo "│ [CRIT] Golden sample 失敗 - 算出エンジンに異常"
  ALERT_COUNT=$((ALERT_COUNT + 1))
fi

# Untracked ファイル過多
UNTRACKED=$(jq -r '.sections.data_integrity.untracked_files // 0' "$SNAPSHOT")
if [ "$UNTRACKED" != "null" ] && [ "$UNTRACKED" -gt 10 ] 2>/dev/null; then
  echo "│ [MED]  Untracked ファイル ${UNTRACKED}件 - commit漏れの可能性"
  ALERT_COUNT=$((ALERT_COUNT + 1))
fi

# API health 異常
API_HEALTH=$(jq -r '.sections.infra.api_health_http_code // "unknown"' "$SNAPSHOT")
if [ "$API_HEALTH" != "200" ]; then
  echo "│ [HIGH] API health check 異常 (HTTP ${API_HEALTH})"
  ALERT_COUNT=$((ALERT_COUNT + 1))
fi

# エラー過多
ERROR_CNT=$(jq -r '.sections.infra.error_count_24h // 0' "$SNAPSHOT")
if [ "$ERROR_CNT" != "null" ] && [ "$ERROR_CNT" -gt 50 ] 2>/dev/null; then
  echo "│ [MED]  API エラー 24h: ${ERROR_CNT}件"
  ALERT_COUNT=$((ALERT_COUNT + 1))
fi

# systemd 異常
SYSTEMD_ST=$(jq -r '.sections.infra.systemd_state // "unknown"' "$SNAPSHOT")
if [ "$SYSTEMD_ST" != "active" ]; then
  echo "│ [CRIT] systemd state: ${SYSTEMD_ST} - サービス停止の可能性"
  ALERT_COUNT=$((ALERT_COUNT + 1))
fi

if [ "$ALERT_COUNT" -eq 0 ]; then
  echo "│ (none) - 全項目正常"
fi

echo "└───────────────────────────────────────────────────────────"
echo ""
echo "Mission Control / Phase 1 MVP  |  TENMON-ARK"
echo "Last snapshot: ${JST_TIME}"
echo "Refreshes every 5 minutes via cron"
