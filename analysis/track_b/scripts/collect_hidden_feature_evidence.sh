#!/usr/bin/env bash
# ============================================================
# collect_hidden_feature_evidence.sh — 隠れた機能の証拠収集
# TENMON_ARK_FULL_SYSTEM_ANALYSIS_V1 / Track B
# ============================================================
# 収集対象:
#   - 実際に稼働しているルート/エンドポイント
#   - 設定ファイルに記述されているが未公開の機能
#   - DBに存在するが UI から見えないテーブル
#   - 自己進化/自己修復ループの稼働状態
# 出力: $OUTPUT_DIR/hidden_feature_evidence/
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/safe_query.sh"

OUTPUT_DIR="${OUTPUT_DIR:-${SCRIPT_DIR}/../output}"
EVIDENCE_DIR="$OUTPUT_DIR/hidden_feature_evidence"
mkdir -p "$EVIDENCE_DIR"

echo "[collect_hidden_feature_evidence] Starting evidence collection..." >&2

# --- 1. API ヘルスチェック ---
echo "[collect_hidden_feature_evidence] Checking API health..." >&2

python3 -c "
import json, subprocess, sys

endpoints = [
    'http://127.0.0.1:3000/health',
    'http://127.0.0.1:3000/api/health',
    'http://127.0.0.1:3000/api/v1/health',
]

results = {}
for ep in endpoints:
    try:
        result = subprocess.run(
            ['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}|%{time_total}', '--max-time', '5', ep],
            capture_output=True, text=True, timeout=10
        )
        parts = result.stdout.split('|')
        results[ep] = {
            'status_code': int(parts[0]) if parts[0].isdigit() else 0,
            'response_time_sec': float(parts[1]) if len(parts) > 1 else 0
        }
    except:
        results[ep] = {'error': 'timeout or unreachable'}

with open('$EVIDENCE_DIR/api_health.json', 'w') as f:
    json.dump(results, f, indent=2, ensure_ascii=False)
print('[collect_hidden_feature_evidence] API health checked.', file=sys.stderr)
"

# --- 2. 実際のルート一覧 (Express) ---
echo "[collect_hidden_feature_evidence] Collecting active routes..." >&2

python3 -c "
import json, subprocess, sys

# Express のルートは直接取得できないため、コードから推定
# api/dist/index.js が存在すれば、ルート定義を grep
routes = []
try:
    result = subprocess.run(
        ['grep', '-rn', 'router\.\(get\|post\|put\|delete\|patch\)', '/opt/tenmon-ark/api/dist/'],
        capture_output=True, text=True, timeout=10
    )
    for line in result.stdout.strip().split('\n')[:100]:
        if line.strip():
            routes.append(line.strip()[:200])
except:
    pass

# server/ 側のルート
server_routes = []
try:
    result = subprocess.run(
        ['grep', '-rn', 'router\.\(get\|post\|put\|delete\|patch\)\|publicProcedure\|protectedProcedure',
         '/opt/tenmon-ark/tenmon-ark/dist/'],
        capture_output=True, text=True, timeout=10
    )
    for line in result.stdout.strip().split('\n')[:100]:
        if line.strip():
            server_routes.append(line.strip()[:200])
except:
    pass

with open('$EVIDENCE_DIR/active_routes.json', 'w') as f:
    json.dump({
        'api_routes_count': len(routes),
        'api_routes_sample': routes[:50],
        'server_routes_count': len(server_routes),
        'server_routes_sample': server_routes[:50]
    }, f, indent=2, ensure_ascii=False)
print(f'[collect_hidden_feature_evidence] Found {len(routes)} api routes, {len(server_routes)} server routes.', file=sys.stderr)
"

# --- 3. 自己進化/自己修復ループの稼働証拠 ---
echo "[collect_hidden_feature_evidence] Checking self-evolution/heal evidence..." >&2

python3 -c "
import json, subprocess, sys

evidence = {}

# journalctl から self-evolution/self-heal 関連ログを検索
keywords = ['selfEvolution', 'selfHeal', 'selfBuild', 'autonomous', 'self-repair', 'evolution-loop']
for kw in keywords:
    try:
        result = subprocess.run(
            ['journalctl', '-u', 'tenmon-ark-api', '--since', '7 days ago', '--no-pager', '-o', 'short-iso',
             '--grep', kw],
            capture_output=True, text=True, timeout=15
        )
        lines = result.stdout.strip().split('\n') if result.stdout.strip() else []
        evidence[kw] = {
            'occurrences': len(lines),
            'sample': lines[:5] if lines else []
        }
    except:
        evidence[kw] = {'error': 'search failed'}

# DB内の self-build/self-heal テーブル
if __import__('os').path.exists('/opt/tenmon-ark-data/kokuzo.sqlite'):
    for table in ['growth_log', 'growth_seeds', 'ark_consciousness']:
        try:
            result = subprocess.run(
                ['sqlite3', '-json', '-readonly', '/opt/tenmon-ark-data/kokuzo.sqlite',
                 '.timeout 10000', f'SELECT COUNT(*) as c FROM {table};'],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0:
                data = json.loads(result.stdout)
                evidence[f'db_{table}'] = {'row_count': data[0]['c'] if data else 0}
            else:
                evidence[f'db_{table}'] = {'error': 'table may not exist'}
        except:
            evidence[f'db_{table}'] = {'error': 'query failed'}

with open('$EVIDENCE_DIR/self_evolution_evidence.json', 'w') as f:
    json.dump(evidence, f, indent=2, ensure_ascii=False)
print('[collect_hidden_feature_evidence] Self-evolution evidence collected.', file=sys.stderr)
"

# --- 4. 虚空蔵 (kokuzo) の稼働証拠 ---
echo "[collect_hidden_feature_evidence] Checking kokuzo evidence..." >&2

if [[ -f "$KOKUZO_DB" ]]; then
  python3 -c "
import json, subprocess, sys

DB = '$KOKUZO_DB'

def sq(sql):
    try:
        r = subprocess.run(['sqlite3', '-json', '-readonly', DB, '.timeout 10000', sql],
                          capture_output=True, text=True, timeout=10)
        return json.loads(r.stdout) if r.returncode == 0 and r.stdout.strip() else []
    except:
        return []

evidence = {}

# thinking_axis 分布
evidence['thinking_axis_distribution'] = sq(
    \"SELECT thinking_axis, COUNT(*) as cnt FROM kokuzo_chunks GROUP BY thinking_axis ORDER BY cnt DESC;\"
)

# 法則候補数
evidence['law_candidates'] = sq('SELECT COUNT(*) as c FROM kokuzo_laws;') if sq('SELECT name FROM sqlite_master WHERE name=\"kokuzo_laws\";') else 'table not found'

# OCRページ数
evidence['ocr_pages'] = sq('SELECT COUNT(*) as c FROM kokuzo_ocr_pages;') if sq('SELECT name FROM sqlite_master WHERE name=\"kokuzo_ocr_pages\";') else 'table not found'

# アルゴリズム数
evidence['algorithms'] = sq('SELECT COUNT(*) as c FROM kokuzo_algorithms;') if sq('SELECT name FROM sqlite_master WHERE name=\"kokuzo_algorithms\";') else 'table not found'

# 復元提案数
evidence['restore_suggestions'] = sq('SELECT COUNT(*) as c FROM kokuzo_restore_suggestions;') if sq('SELECT name FROM sqlite_master WHERE name=\"kokuzo_restore_suggestions\";') else 'table not found'

with open('$EVIDENCE_DIR/kokuzo_evidence.json', 'w') as f:
    json.dump(evidence, f, indent=2, ensure_ascii=False)
print('[collect_hidden_feature_evidence] Kokuzo evidence collected.', file=sys.stderr)
"
fi

# --- 5. MC (Mission Control) の稼働証拠 ---
echo "[collect_hidden_feature_evidence] Checking MC evidence..." >&2

python3 -c "
import json, os, sys

evidence = {}

# MC snapshot
mc_snapshot = '/var/www/tenmon-mc/data/snapshot.json'
if os.path.exists(mc_snapshot):
    try:
        with open(mc_snapshot) as f:
            data = json.load(f)
        evidence['snapshot_exists'] = True
        evidence['snapshot_size'] = os.path.getsize(mc_snapshot)
        evidence['snapshot_sections'] = list(data.keys()) if isinstance(data, dict) else 'not a dict'
    except:
        evidence['snapshot_exists'] = True
        evidence['snapshot_error'] = 'parse failed'
else:
    evidence['snapshot_exists'] = False

# MC log
mc_log = '/var/log/tenmon-mc.log'
if os.path.exists(mc_log):
    evidence['log_exists'] = True
    evidence['log_size'] = os.path.getsize(mc_log)
    try:
        with open(mc_log) as f:
            lines = f.readlines()
        evidence['log_lines'] = len(lines)
        evidence['log_last_10'] = [l.strip() for l in lines[-10:]]
    except:
        evidence['log_error'] = 'read failed'
else:
    evidence['log_exists'] = False

# MC history DB
mc_db = '/var/www/tenmon-mc/data/history.db'
if os.path.exists(mc_db):
    evidence['history_db_exists'] = True
    evidence['history_db_size'] = os.path.getsize(mc_db)
else:
    evidence['history_db_exists'] = False

with open('$EVIDENCE_DIR/mc_evidence.json', 'w') as f:
    json.dump(evidence, f, indent=2, ensure_ascii=False)
print('[collect_hidden_feature_evidence] MC evidence collected.', file=sys.stderr)
"

echo "[collect_hidden_feature_evidence] Done. Output: $EVIDENCE_DIR/" >&2
