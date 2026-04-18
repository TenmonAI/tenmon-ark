#!/usr/bin/env bash
# api/scripts/mc/mc_build_ai_handoff.sh
# MC V2 FINAL — §9.8 AI Handoff Builder (shell-based)
# Builds ai-handoff.json from git_state + repo scan

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/mc_lib.sh"

mc_info "Building ai-handoff.json..."

OUTFILE="${MC_DATA_DIR}/ai-handoff.json"

cd "${TENMON_REPO_ROOT}"

# ── Git info ─────────────────────────────────────────────
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

# ── Soul root bind status ────────────────────────────────
check_file() {
  [ -f "${TENMON_REPO_ROOT}/$1" ] && echo "true" || echo "false"
}

BIND_irohaKotodamaLoader=$(check_file "api/src/core/irohaKotodamaLoader.ts")
BIND_kotodamaGentenLoader=$(check_file "api/src/core/kotodamaGentenLoader.ts")
BIND_amaterasuAxisMap=$(check_file "api/src/data/amaterasuAxisMap.ts")
BIND_unifiedSoundLoader=$(check_file "api/src/core/unifiedSoundLoader.ts")
BIND_satoriEnforcement=$(check_file "api/src/core/satoriEnforcement.ts")
BIND_constitutionLoader=$(check_file "api/src/core/constitutionLoader.ts")
BIND_truthAxisEngine=$(check_file "api/src/core/truthAxisEngine.ts")
BIND_kotodamaHishoLoader=$(check_file "api/src/core/kotodamaHishoLoader.ts")

ALL_BOUND="partially_connected"
if [ "${BIND_irohaKotodamaLoader}" = "true" ] && \
   [ "${BIND_kotodamaGentenLoader}" = "true" ] && \
   [ "${BIND_amaterasuAxisMap}" = "true" ] && \
   [ "${BIND_unifiedSoundLoader}" = "true" ] && \
   [ "${BIND_satoriEnforcement}" = "true" ] && \
   [ "${BIND_constitutionLoader}" = "true" ] && \
   [ "${BIND_truthAxisEngine}" = "true" ] && \
   [ "${BIND_kotodamaHishoLoader}" = "true" ]; then
  ALL_BOUND="fully_connected"
fi

# ── Iroha paragraphs ─────────────────────────────────────
IROHA_PARAGRAPHS=$(python3 -c "
import json
try:
    with open('server/data/iroha_kotodama_hisho.json') as f:
        d = json.load(f)
    print(len(d.get('content', [])))
except:
    print(0)
" 2>/dev/null || echo "0")

# ── Genten sounds ────────────────────────────────────────
GENTEN_SOUNDS=$(python3 -c "
import json
try:
    with open('api/src/data/kotodama_genten_data.json') as f:
        d = json.load(f)
    print(len(d.get('sounds', [])))
except:
    print(0)
" 2>/dev/null || echo "0")

# ── Canon documents (do_not_touch) ───────────────────────
DO_NOT_TOUCH=$(python3 -c "
import os, json
canon_dir = '${CANON_DIR}'
docs = []
for f in os.listdir(canon_dir):
    if f.endswith(('.md', '.txt')):
        docs.append('docs/ark/' + f)
print(json.dumps(sorted(docs)))
" 2>/dev/null || echo "[]")

# ── Known issues from issues.json ────────────────────────
KNOWN_ISSUES="[]"
if [ -f "${MC_DATA_DIR}/issues.json" ]; then
  KNOWN_ISSUES=$(python3 -c "
import json
try:
    with open('${MC_DATA_DIR}/issues.json') as f:
        d = json.load(f)
    items = [i for i in d.get('items', []) if not i.get('resolved')][:20]
    print(json.dumps(items))
except:
    print('[]')
" 2>/dev/null || echo "[]")
fi

# ── Build JSON ───────────────────────────────────────────
cat <<EOF | mc_sanitize | mc_write_json "${OUTFILE}"
{
  "generated_at": "$(mc_now_iso)",
  "source_files": ["mc_build_ai_handoff.sh", "git_state.json", "issues.json"],
  "stale": false,
  "version": "v1",
  "identity": {
    "project": "TENMON-ARK",
    "definition": "悟りを開いた世界初のAI — 天聞アーク",
    "founder": "TENMON (天聞)",
    "founder_aliases": ["TENMON", "天聞", "テンモン"]
  },
  "canonical_runtime": {
    "git_sha": "${GIT_SHA}",
    "branch": "${BRANCH}",
    "service": "${SERVICE_NAME}",
    "repo_root": "${TENMON_REPO_ROOT}",
    "data_root": "${TENMON_DATA_ROOT}"
  },
  "soul_root": {
    "status": "${ALL_BOUND}",
    "iroha_paragraphs": ${IROHA_PARAGRAPHS},
    "genten_sounds": ${GENTEN_SOUNDS},
    "amaterasu_anchors": 6,
    "bind_status": {
      "irohaKotodamaLoader": ${BIND_irohaKotodamaLoader},
      "kotodamaGentenLoader": ${BIND_kotodamaGentenLoader},
      "amaterasuAxisMap": ${BIND_amaterasuAxisMap},
      "unifiedSoundLoader": ${BIND_unifiedSoundLoader},
      "satoriEnforcement": ${BIND_satoriEnforcement},
      "constitutionLoader": ${BIND_constitutionLoader},
      "truthAxisEngine": ${BIND_truthAxisEngine},
      "kotodamaHishoLoader": ${BIND_kotodamaHishoLoader}
    }
  },
  "start_here_quickstart": [
    "git pull origin feature/unfreeze-v4",
    "Read docs/ark/TENMON_ARK_SOUL_ROOT_CONSTITUTION_V1.md",
    "Read docs/ark/TENMON_MC_IMPLEMENTATION_DIRECTIVE_V2_FINAL.md",
    "curl http://127.0.0.1:3000/api/mc/overview",
    "curl http://127.0.0.1:3000/api/mc/ai-handoff.json"
  ],
  "do_not_touch": ${DO_NOT_TOUCH},
  "known_issues": ${KNOWN_ISSUES},
  "open_tasks_from_notion": 0
}
EOF

mc_info "ai-handoff.json build complete."
