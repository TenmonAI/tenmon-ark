#!/bin/bash
# ============================================================
# TENMON-MC メイン収集スクリプト
# 5分ごとcronで実行
# 出力: snapshot.json + report.txt
# ============================================================
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

TIMESTAMP=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
TIMESTAMP_JST=$(TZ=Asia/Tokyo date '+%Y-%m-%d %H:%M:%S JST')

mkdir -p "${DATA_DIR}/history"

# ── Phase 1 セクション (§1-6) ──
INFRA=$("${SCRIPT_DIR}/collect_infra.sh" 2>/dev/null || echo '{"section":"infra","error":"script failed"}')
SUKUYOU=$("${SCRIPT_DIR}/collect_sukuyou.sh" 2>/dev/null || echo '{"section":"sukuyou","error":"script failed"}')
KOTODAMA=$("${SCRIPT_DIR}/collect_kotodama.sh" 2>/dev/null || echo '{"section":"kotodama","error":"script failed"}')
FOUNDER=$("${SCRIPT_DIR}/collect_founder.sh" 2>/dev/null || echo '{"section":"founder","error":"script failed"}')
LEARNING=$("${SCRIPT_DIR}/collect_learning.sh" 2>/dev/null || echo '{"section":"learning","error":"script failed"}')
DATA_INT=$("${SCRIPT_DIR}/collect_data_integrity.sh" 2>/dev/null || echo '{"section":"data_integrity","error":"script failed"}')

# ── Phase 2 セクション (§7-12) ──
LLM_ROUTING=$("${SCRIPT_DIR}/collect_llm_routing.sh" 2>/dev/null || echo '{"section":"llm_routing","error":"script failed"}')
DIALOGUE_QUALITY=$("${SCRIPT_DIR}/collect_dialogue_quality.sh" 2>/dev/null || echo '{"section":"dialogue_quality","error":"script failed"}')
NOTION_SYNC=$("${SCRIPT_DIR}/collect_notion_sync.sh" 2>/dev/null || echo '{"section":"notion_sync","error":"script failed"}')
PERSONA=$("${SCRIPT_DIR}/collect_persona.sh" 2>/dev/null || echo '{"section":"persona_system","error":"script failed"}')
SACRED=$("${SCRIPT_DIR}/collect_sacred_corpus.sh" 2>/dev/null || echo '{"section":"sacred_corpus","error":"script failed"}')
FEEDBACK=$("${SCRIPT_DIR}/collect_feedback.sh" 2>/dev/null || echo '{"section":"user_feedback","error":"script failed"}')

# 統合JSON (12セクション)
cat > "${DATA_DIR}/snapshot.json" <<JSON
{
  "generated_at_utc": "${TIMESTAMP}",
  "generated_at_jst": "${TIMESTAMP_JST}",
  "version": "MC-P2",
  "sections": {
    "infra": ${INFRA},
    "sukuyou": ${SUKUYOU},
    "kotodama": ${KOTODAMA},
    "founder": ${FOUNDER},
    "learning": ${LEARNING},
    "data_integrity": ${DATA_INT},
    "llm_routing": ${LLM_ROUTING},
    "dialogue_quality": ${DIALOGUE_QUALITY},
    "notion_sync": ${NOTION_SYNC},
    "persona_system": ${PERSONA},
    "sacred_corpus": ${SACRED},
    "user_feedback": ${FEEDBACK}
  }
}
JSON

# テキストレポート生成
"${SCRIPT_DIR}/assemble_report.sh" > "${DATA_DIR}/report.txt"

# 履歴保存
HIST_FILE="${DATA_DIR}/history/$(date -u '+%Y%m%d_%H%M').json"
cp "${DATA_DIR}/snapshot.json" "${HIST_FILE}"

# 古い履歴削除
find "${DATA_DIR}/history" -name "*.json" -type f -mmin +"${HISTORY_RETENTION_MIN}" -delete 2>/dev/null

# ファイル権限
chmod 644 "${DATA_DIR}/snapshot.json" "${DATA_DIR}/report.txt" 2>/dev/null

exit 0
