#!/usr/bin/env bash
# SANSKRIT_KOTODAMA_SOURCE_IMPORT_V1 — create VPS directory tree from registry; optional verify
set -euo pipefail

API_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REGISTRY_JSON="${API_ROOT}/data/sources/sanskrit_kotodama_sources_v1.json"
BASE="${TENMON_DATA_DIR:-/opt/tenmon-ark-data}"
CMD="${1:-init}"

if [ ! -f "${REGISTRY_JSON}" ]; then
  echo "[FAIL] registry missing: ${REGISTRY_JSON}"
  exit 2
fi

node -e "
const fs = require('fs');
const p = process.argv[1];
let j;
try { j = JSON.parse(fs.readFileSync(p, 'utf8')); }
catch (e) { console.error('[FAIL] invalid JSON:', e.message); process.exit(3); }
if (j.schema !== 'SANSKRIT_KOTODAMA_SOURCES_V1') {
  console.error('[FAIL] schema mismatch');
  process.exit(4);
}
if (!Array.isArray(j.sources)) {
  console.error('[FAIL] sources must be an array');
  process.exit(5);
}
const root = j.sources_root_relative || '';
for (const s of j.sources) {
  for (const k of ['source_id','title','layer','language','storage_relative_path']) {
    if (s[k] == null || s[k] === '') {
      console.error('[FAIL] source missing field:', k, s);
      process.exit(6);
    }
  }
  const layer = s.layer;
  if (!['classical_sanskrit','bhs','kotodama'].includes(layer)) {
    console.error('[FAIL] invalid layer:', layer, s.source_id);
    process.exit(7);
  }
}
console.log(JSON.stringify({ ok: true, count: j.sources.length, root }));
" "${REGISTRY_JSON}" >/dev/null

REL_ROOT="$(node -e "console.log(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).sources_root_relative)" "${REGISTRY_JSON}")"
FULL_ROOT="${BASE%/}/${REL_ROOT}"

mk_tree() {
  echo "[INIT] base=${BASE}"
  echo "[INIT] sources_root=${FULL_ROOT}"
  mkdir -p "${FULL_ROOT}"
  while IFS= read -r SUB; do
    [ -z "${SUB}" ] && continue
    mkdir -p "${FULL_ROOT}/${SUB}"
  done < <(node -e "
const fs = require('fs');
const j = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
for (const s of j.sources) {
  const rel = s.storage_relative_path;
  console.log(rel + '/original');
  console.log(rel + '/extracted/text');
  console.log(rel + '/extracted/ocr');
  console.log(rel + '/extracted/meta');
}
" "${REGISTRY_JSON}")
  echo "[OK] directory tree ensured under ${FULL_ROOT}"
}

verify_tree() {
  local bad=0
  echo "[VERIFY] registry=${REGISTRY_JSON}"
  echo "[VERIFY] root=${FULL_ROOT}"
  while IFS= read -r SUB; do
    if [ ! -d "${FULL_ROOT}/${SUB}" ]; then
      echo "[MISS] ${FULL_ROOT}/${SUB}"
      bad=1
    fi
  done < <(node -e "
const fs = require('fs');
const j = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
for (const s of j.sources) {
  const rel = s.storage_relative_path;
  for (const x of ['original', 'extracted/text', 'extracted/ocr', 'extracted/meta']) {
    console.log(rel + '/' + x);
  }
}
" "${REGISTRY_JSON}")
  if [ "${bad}" -ne 0 ]; then
    echo "[FAIL] verify: run init first"
    exit 8
  fi
  echo "[OK] verify passed"
}

case "${CMD}" in
  init) mk_tree ;;
  verify) verify_tree ;;
  *)
    echo "usage: $0 init|verify"
    exit 2
    ;;
esac
