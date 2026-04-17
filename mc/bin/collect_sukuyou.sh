#!/bin/bash
# ============================================================
# TENMON-MC §2: 宿曜鑑定品質
# 出力: JSON (stdout)
# ============================================================
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

# ゴールデンサンプル検証
GOLDEN_RESULT=$(cd "${REPO_PATH}/api" && timeout 10 node -e "
try {
  const { calculateHonmeiShuku } = require('./dist/sukuyou/sukuyouEngine.js');
  const s = calculateHonmeiShuku(new Date('${GOLDEN_BIRTHDATE:-1990-09-26}T00:00:00+09:00'));
  console.log(s);
} catch(e) {
  console.log('ERROR');
}
" 2>/dev/null || echo "ERROR")

# LOOKUP TABLE のエントリ数
LOOKUP_ENTRIES=$(cd "${REPO_PATH}/api" && timeout 5 node -e "
try {
  const fs = require('fs');
  const path = require('path');
  // dist 内の JSON を探す
  const candidates = [
    path.join(__dirname, 'dist/sukuyou/sukuyou_lookup_table.json'),
    path.join(__dirname, 'src/sukuyou/sukuyou_lookup_table.json'),
    path.join(__dirname, 'dist/data/sukuyou_lookup_table.json')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      console.log(Array.isArray(data) ? data.length : Object.keys(data).length);
      process.exit(0);
    }
  }
  console.log(0);
} catch(e) {
  console.log(0);
}
" 2>/dev/null || echo "0")

# 深化データ実装宿数
DEEP_SHUKU_COUNT=$(cd "${REPO_PATH}/api" && timeout 5 node -e "
try {
  const candidates = [
    './dist/data/shuku_deep_data.js',
    './dist/sukuyou/shuku_deep_data.js'
  ];
  for (const p of candidates) {
    try {
      const mod = require(p);
      const data = mod.SHUKU_DEEP_DATA || mod.default || [];
      if (Array.isArray(data)) { console.log(data.length); process.exit(0); }
      if (typeof data === 'object') { console.log(Object.keys(data).length); process.exit(0); }
    } catch(_) {}
  }
  console.log(0);
} catch(e) {
  console.log(0);
}
" 2>/dev/null || echo "0")

# ゴールデンサンプル合否
GOLDEN_PASS="false"
EXPECTED="${GOLDEN_EXPECTED_SHUKU:-斗}"
if [ "$GOLDEN_RESULT" = "$EXPECTED" ]; then
  GOLDEN_PASS="true"
fi

# 深化データカバー率
COVERAGE=$(echo "scale=1; $(ensure_num "$DEEP_SHUKU_COUNT")*100/27" | bc 2>/dev/null || echo "0")

cat <<JSON
{
  "section": "sukuyou",
  "golden_sample_birthdate": "$(json_string_safe "${GOLDEN_BIRTHDATE:-1990-09-26}")",
  "golden_sample_result": "$(json_string_safe "$GOLDEN_RESULT")",
  "golden_sample_expected": "$(json_string_safe "$EXPECTED")",
  "golden_sample_pass": ${GOLDEN_PASS},
  "lookup_table_entries": $(ensure_num "$LOOKUP_ENTRIES"),
  "deep_data_shuku_count": $(ensure_num "$DEEP_SHUKU_COUNT"),
  "deep_data_coverage_pct": "$(json_string_safe "$COVERAGE")"
}
JSON
