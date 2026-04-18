#!/usr/bin/env bash
# api/scripts/mc/mc_collect_all.sh
# MC V2 FINAL — §9.7 Orchestrator (runs all Phase 1 collectors)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/mc_lib.sh"

mc_info "=== MC Collect All: Phase 1 ==="

FAILED=0
TOTAL=0

run_collector() {
  local name="$1"
  local script="$2"
  TOTAL=$((TOTAL + 1))
  mc_info "Running ${name}..."
  if bash "${SCRIPT_DIR}/${script}" 2>&1; then
    mc_info "${name} ✓"
  else
    mc_error "${name} FAILED (exit $?)"
    FAILED=$((FAILED + 1))
  fi
}

# ── Phase 1 collectors ───────────────────────────────────
run_collector "live_state"   "mc_collect_live_state.sh"
run_collector "git_state"    "mc_collect_git_state.sh"
run_collector "ai_handoff"   "mc_build_ai_handoff.sh"

# ── Build overview (aggregation of all above) ────────────
mc_info "Building overview.json..."
OVERVIEW_FILE="${MC_DATA_DIR}/overview.json"

# Overview is built by the TypeScript builder at runtime,
# but we also create a shell-based snapshot for offline use.
python3 -c "
import json, os, glob

mc_dir = '${MC_DATA_DIR}'
files = {}
for f in glob.glob(os.path.join(mc_dir, '*.json')):
    name = os.path.basename(f)
    try:
        stat = os.stat(f)
        files[name] = {
            'size_bytes': stat.st_size,
            'mtime': stat.st_mtime,
        }
    except:
        pass

overview = {
    'generated_at': '$(mc_now_iso)',
    'source_files': list(files.keys()),
    'stale': False,
    'collector_files': files,
    'total_collectors_run': ${TOTAL},
    'failed_collectors': ${FAILED},
}

with open('${OVERVIEW_FILE}', 'w') as f:
    json.dump(overview, f, indent=2, ensure_ascii=False)
print(f'Wrote {OVERVIEW_FILE}')
" 2>/dev/null || mc_warn "overview.json build failed"

# ── Summary ──────────────────────────────────────────────
mc_info "=== MC Collect All Complete: ${TOTAL} run, ${FAILED} failed ==="

if [ "${FAILED}" -gt 0 ]; then
  mc_warn "${FAILED} collector(s) failed"
  exit 1
fi

exit 0
