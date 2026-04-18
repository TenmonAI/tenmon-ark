#!/usr/bin/env bash
# api/scripts/mc/mc_collect_git_state.sh
# MC V2 FINAL — §9.3 Git State Collector

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/mc_lib.sh"

mc_info "Collecting git_state..."

OUTFILE="${MC_DATA_DIR}/git_state.json"

cd "${TENMON_REPO_ROOT}"

# ── Basic git info ───────────────────────────────────────
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
HEAD_SHA=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
HEAD_SHA_SHORT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
HEAD_SUBJECT=$(git log -1 --format="%s" 2>/dev/null || echo "unknown")
HEAD_DATE=$(git log -1 --format="%aI" 2>/dev/null || echo "unknown")
HEAD_AUTHOR=$(git log -1 --format="%an" 2>/dev/null || echo "unknown")

# ── Dirty state ──────────────────────────────────────────
DIRTY=$(git status --porcelain 2>/dev/null | wc -l)
IS_DIRTY=$([ "${DIRTY}" -gt 0 ] && echo "true" || echo "false")
UNTRACKED=$(git status --porcelain 2>/dev/null | grep "^??" | wc -l)
MODIFIED=$(git status --porcelain 2>/dev/null | grep -v "^??" | wc -l)

# ── Recent commits ───────────────────────────────────────
RECENT_COMMITS=$(git log --format='{"sha":"%h","subject":"%s","author":"%an","date":"%aI"}' -20 2>/dev/null | python3 -c "
import json, sys
commits = []
for line in sys.stdin:
    line = line.strip()
    if line:
        try:
            commits.append(json.loads(line))
        except:
            pass
print(json.dumps(commits))
" 2>/dev/null || echo "[]")

# ── Recent tags ──────────────────────────────────────────
RECENT_TAGS=$(git tag --sort=-creatordate --format='{"name":"%(refname:short)","date":"%(creatordate:iso-strict)","sha":"%(objectname:short)"}' 2>/dev/null | head -10 | python3 -c "
import json, sys
tags = []
for line in sys.stdin:
    line = line.strip()
    if line:
        try:
            tags.append(json.loads(line))
        except:
            pass
print(json.dumps(tags))
" 2>/dev/null || echo "[]")

# ── Reflog ───────────────────────────────────────────────
REFLOG=$(git reflog --format="%h %gd: %gs" -10 2>/dev/null | python3 -c "
import json, sys
lines = [l.strip() for l in sys.stdin if l.strip()]
print(json.dumps(lines[:10]))
" 2>/dev/null || echo "[]")

# ── Stats ────────────────────────────────────────────────
REPO_SIZE_KB=$(du -sk .git 2>/dev/null | awk '{print $1}' || echo "0")
REPO_SIZE_MB=$(echo "scale=1; ${REPO_SIZE_KB} / 1024" | bc 2>/dev/null || echo "0")
TOTAL_COMMITS=$(git rev-list --count HEAD 2>/dev/null || echo "0")
COMMITS_7D=$(git rev-list --count --since="7 days ago" HEAD 2>/dev/null || echo "0")
CONTRIBUTORS=$(git shortlog -sn HEAD 2>/dev/null | wc -l || echo "0")

# ── Build JSON ───────────────────────────────────────────
cat <<EOF | mc_sanitize | mc_write_json "${OUTFILE}"
{
  "generated_at": "$(mc_now_iso)",
  "source_files": ["mc_collect_git_state.sh"],
  "stale": false,
  "branch": "${BRANCH}",
  "head_sha": "${HEAD_SHA}",
  "head_sha_short": "${HEAD_SHA_SHORT}",
  "head_subject": $(echo "${HEAD_SUBJECT}" | json_escape),
  "head_date": "${HEAD_DATE}",
  "head_author": $(echo "${HEAD_AUTHOR}" | json_escape),
  "dirty": ${IS_DIRTY},
  "untracked_count": ${UNTRACKED},
  "modified_count": ${MODIFIED},
  "recent_commits": ${RECENT_COMMITS},
  "recent_tags": ${RECENT_TAGS},
  "reflog": ${REFLOG},
  "stats": {
    "repo_size_mb": ${REPO_SIZE_MB},
    "total_commits": ${TOTAL_COMMITS},
    "commits_7d": ${COMMITS_7D},
    "contributors": ${CONTRIBUTORS}
  }
}
EOF

mc_info "git_state collection complete."
