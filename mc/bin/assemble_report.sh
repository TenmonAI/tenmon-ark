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
VERSION=$(jq -r '.version // "unknown"' "$SNAPSHOT")

cat <<EOF
============================================================
  TENMON-ARK Mission Control / ${VERSION}
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
  "│ DB tables:               \(.db_table_count)\n" +
  "│ Missing tables:          \(.expected_tables_missing // "none")"' "$SNAPSHOT" 2>/dev/null || echo "│ [ERROR] data_integrity section parse failed"

echo "└───────────────────────────────────────────────────────────"
echo ""

# ── Phase 2 セクション (§7-12) ──

echo "┌─ §7 LLM ROUTING ルーティング内訳 ────────────────────────"

jq -r '.sections.llm_routing |
  "│ 総Synapse (24h):         \(.total_synapse_24h)\n" +
  "│ 鑑定Route (24h):         \(.kantei_routes_24h)\n" +
  "│ Deep Report (24h):       \(.deep_reports_24h)\n" +
  "│ Route分布:"' "$SNAPSHOT" 2>/dev/null || echo "│ [ERROR] llm_routing section parse failed"

jq -r '.sections.llm_routing.route_distribution // {} | to_entries[] | "│   \(.key): \(.value)回"' "$SNAPSHOT" 2>/dev/null

echo "└───────────────────────────────────────────────────────────"
echo ""
echo "┌─ §8 DIALOGUE QUALITY 対話品質 ───────────────────────────"

jq -r '.sections.dialogue_quality |
  "│ 平均応答長 (24h):        \(.avg_response_length_24h) 字\n" +
  "│ 最大応答長 (24h):        \(.max_response_length_24h) 字\n" +
  "│ Longform >5000字 (24h):  \(.longform_count_24h)\n" +
  "│ 総応答数 (24h):          \(.total_responses_24h)\n" +
  "│ 深化Seed使用 (24h):      \(.seeds_with_scripture_24h)\n" +
  "│ 総Seed (24h):            \(.total_seeds_24h)"' "$SNAPSHOT" 2>/dev/null || echo "│ [ERROR] dialogue_quality section parse failed"

echo "└───────────────────────────────────────────────────────────"
echo ""
echo "┌─ §9 NOTION SYNC ─────────────────────────────────────────"

jq -r '.sections.notion_sync |
  "│ Notionページ (cached):   \(.notion_pages_cached)\n" +
  "│ Pending Reflections:     \(.pending_reflections)\n" +
  "│ 最終同期:                \(.last_notion_sync)"' "$SNAPSHOT" 2>/dev/null || echo "│ [ERROR] notion_sync section parse failed"

echo "└───────────────────────────────────────────────────────────"
echo ""
echo "┌─ §10 PERSONA SYSTEM ─────────────────────────────────────"

jq -r '.sections.persona_system |
  "│ 総ペルソナ数:            \(.total_personas)\n" +
  "│ アクティブ:              \(.active_personas)\n" +
  "│ Memory Units:            \(.total_memory_units)\n" +
  "│ Thread Links:            \(.thread_persona_links)\n" +
  "│ 最終デプロイ:            \(.last_deployment)"' "$SNAPSHOT" 2>/dev/null || echo "│ [ERROR] persona_system section parse failed"

echo "└───────────────────────────────────────────────────────────"
echo ""
echo "┌─ §11 SACRED CORPUS 神聖典籍 ─────────────────────────────"

jq -r '.sections.sacred_corpus |
  "│ 登録コーパス:            \(.total_corpus_registered)\n" +
  "│ セグメント:              \(.total_segments)\n" +
  "│ 文献学ユニット:          \(.total_philology_units)\n" +
  "│ 真理軸バインディング:    \(.total_axis_bindings)\n" +
  "│ 比較リンク:              \(.comparative_links)\n" +
  "│ 真理軸分布:"' "$SNAPSHOT" 2>/dev/null || echo "│ [ERROR] sacred_corpus section parse failed"

jq -r '.sections.sacred_corpus.truth_axes_distribution // {} | to_entries[] | "│   \(.key): \(.value)"' "$SNAPSHOT" 2>/dev/null

echo "└───────────────────────────────────────────────────────────"
echo ""
echo "┌─ §12 USER FEEDBACK ──────────────────────────────────────"

jq -r '.sections.user_feedback |
  "│ 総フィードバック:        \(.total_feedback_files)\n" +
  "│ 直近7日:                 \(.feedback_last_7days)\n" +
  "│ 平均Rating (30d):        \(.avg_rating_last_30days)\n" +
  "│ Rating サンプル数:       \(.rating_sample_size)"' "$SNAPSHOT" 2>/dev/null || echo "│ [ERROR] user_feedback section parse failed"

echo "└───────────────────────────────────────────────────────────"
echo ""

# ── ALERTS ──
echo "┌─ ALERTS (Auto-Detected) ──────────────────────────────────"

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

# Phase 2 追加アラート

# 期待テーブル欠損
MISSING_TBLS=$(jq -r '.sections.data_integrity.expected_tables_missing // "none"' "$SNAPSHOT")
if [ "$MISSING_TBLS" != "none" ] && [ "$MISSING_TBLS" != "null" ] && [ -n "$MISSING_TBLS" ]; then
  echo "│ [HIGH] 期待テーブル欠損: ${MISSING_TBLS}"
  ALERT_COUNT=$((ALERT_COUNT + 1))
fi

# Notion Pending 過多
PENDING_REF=$(jq -r '.sections.notion_sync.pending_reflections // 0' "$SNAPSHOT")
if [ "$PENDING_REF" != "null" ] && [ "$PENDING_REF" -gt 20 ] 2>/dev/null; then
  echo "│ [MED]  Notion pending reflections: ${PENDING_REF}件"
  ALERT_COUNT=$((ALERT_COUNT + 1))
fi

# フィードバック急増
FB_7D=$(jq -r '.sections.user_feedback.feedback_last_7days // 0' "$SNAPSHOT")
if [ "$FB_7D" != "null" ] && [ "$FB_7D" -gt 10 ] 2>/dev/null; then
  echo "│ [MED]  フィードバック急増 (7d): ${FB_7D}件 - 確認推奨"
  ALERT_COUNT=$((ALERT_COUNT + 1))
fi

if [ "$ALERT_COUNT" -eq 0 ]; then
  echo "│ (none) - 全項目正常"
fi

echo "└───────────────────────────────────────────────────────────"
echo ""
echo "Mission Control / ${VERSION}  |  TENMON-ARK"
echo "Last snapshot: ${JST_TIME}"
echo "Refreshes every 5 minutes via cron"
