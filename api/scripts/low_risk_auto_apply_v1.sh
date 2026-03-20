#!/usr/bin/env bash
set -euo pipefail

# LOW_RISK_AUTO_APPLY_V1
# - auto_apply_allowed だけ実行
# - review_required / forbidden は停止
# - acceptance 未指定は停止
# - 失敗時は staged/worktree を戻して終了

ROOT="/opt/tenmon-ark-repo"
LOG_DIR="/var/log/tenmon/low_risk_auto_apply_v1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_FILE="${LOG_DIR}/run_${TS}.log"
mkdir -p "${LOG_DIR}"
exec > >(tee -a "${LOG_FILE}") 2>&1

MODE="${MODE:-MIN_DIFF_PATCH}"
ACCEPTANCE_CMD="${ACCEPTANCE_CMD:-}"
CANDIDATE_FILES="${CANDIDATE_FILES:-}" # optional comma-separated override

cd "${ROOT}"

if [ -n "${CANDIDATE_FILES}" ]; then
  mapfile -t FILES < <(printf "%s" "${CANDIDATE_FILES}" | tr ',' '\n' | sed '/^$/d')
else
  mapfile -t FILES < <(git diff --cached --name-only)
fi

if [ "${#FILES[@]}" -eq 0 ]; then
  echo "[STOP] no target files"
  exit 10
fi

echo "[TS] ${TS}"
echo "[MODE] ${MODE}"
echo "[FILES]"
printf ' - %s\n' "${FILES[@]}"

is_docs_only=true
for p in "${FILES[@]}"; do
  case "${p}" in
    api/docs/*|docs/*|*.md) ;;
    *) is_docs_only=false ;;
  esac
done

has_docs=false
has_runtime=false
for p in "${FILES[@]}"; do
  case "${p}" in
    api/docs/*|docs/*|*.md) has_docs=true ;;
    *) has_runtime=true ;;
  esac
done

if [ "${has_docs}" = true ] && [ "${has_runtime}" = true ]; then
  echo "[STOP] docs-only と runtime の混在"
  exit 11
fi

CLASS="auto_apply_allowed"
REASON="n/a"

for p in "${FILES[@]}"; do
  case "${p}" in
    api/src/db/kokuzo_schema.sql|*/kokuzo_schema.sql)
      CLASS="auto_apply_forbidden"; REASON="no-touch"; break ;;
    /etc/*|automation/systemd/*|api/scripts/*backup*|api/scripts/*restore*)
      CLASS="auto_apply_forbidden"; REASON="infra_or_backup_core"; break ;;
    api/src/routes/chat.ts|api/src/routes/chat_refactor/finalize.ts|api/src/routes/founderRequest.ts)
      CLASS="auto_apply_review_required"; REASON="high_impact_route_surface" ;;
  esac
done

if [ "${CLASS}" = "auto_apply_allowed" ]; then
  if [ "${is_docs_only}" = false ] && [ "${#FILES[@]}" -gt 3 ]; then
    CLASS="auto_apply_forbidden"
    REASON="broad_diff"
  fi
fi

if [ "${CLASS}" != "auto_apply_allowed" ]; then
  echo "[STOP] class=${CLASS} reason=${REASON}"
  exit 12
fi

if [ "${MODE}" != "DOCS_ONLY" ] && [ -z "${ACCEPTANCE_CMD}" ]; then
  echo "[STOP] acceptance command is required for runtime mode"
  exit 13
fi

PATCH_BAK="${LOG_DIR}/staged_${TS}.patch"
git diff --cached > "${PATCH_BAK}" || true

rollback() {
  echo "[ROLLBACK] start"
  git restore --staged -- "${FILES[@]}" || true
  git restore -- "${FILES[@]}" || true
  echo "[ROLLBACK] done"
}

echo "[CLASS] ${CLASS}"
echo "[REASON] ${REASON}"
echo "[PATCH_BAK] ${PATCH_BAK}"

if [ "${MODE}" = "DOCS_ONLY" ]; then
  echo "[PASS] docs-only gate passed"
  exit 0
fi

set +e
bash -lc "${ACCEPTANCE_CMD}"
RC=$?
set -e
if [ ${RC} -ne 0 ]; then
  echo "[STOP] acceptance failed rc=${RC}"
  rollback
  exit ${RC}
fi

echo "[PASS] acceptance ok"
