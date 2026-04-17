#!/usr/bin/env bash
# ============================================================
# collect_founder_usage.sh — Founder利用パターン収集スクリプト
# TENMON_ARK_FULL_SYSTEM_ANALYSIS_V1 / Track B
# ============================================================
# 収集対象:
#   - API エンドポイント利用状況（匿名化）
#   - 宿曜鑑定の宿分布（個人情報なし）
#   - 対話ログの統計（件数・長さのみ）
#   - エラーパターン（匿名化）
# 出力: $OUTPUT_DIR/founder_usage.json
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/safe_query.sh"
source "${SCRIPT_DIR}/lib/mask_personal_info.sh"

OUTPUT_DIR="${OUTPUT_DIR:-${SCRIPT_DIR}/../output}"
mkdir -p "$OUTPUT_DIR"

validate_salt

echo "[collect_founder_usage] Starting founder usage collection..." >&2

# --- 1. SQLite DB 統計 ---
if [[ -f "$KOKUZO_DB" ]]; then
  echo "[collect_founder_usage] Collecting SQLite statistics..." >&2

  python3 -c "
import json, subprocess, sys, os

DB = os.environ.get('KOKUZO_DB', '/opt/tenmon-ark-data/kokuzo.sqlite')

def safe_query(sql):
    try:
        result = subprocess.run(
            ['sqlite3', '-json', '-readonly', DB, '.timeout 10000', sql],
            capture_output=True, text=True, timeout=15
        )
        if result.returncode == 0 and result.stdout.strip():
            return json.loads(result.stdout)
        return []
    except:
        return []

stats = {}

# セッション数
r = safe_query('SELECT COUNT(DISTINCT session_id) as c FROM session_memory;')
stats['total_sessions'] = r[0]['c'] if r else 'N/A'

# 会話ログ件数
r = safe_query('SELECT COUNT(*) as c FROM conversation_log;')
stats['total_conversation_entries'] = r[0]['c'] if r else 'N/A'

# ユーザーメモリ件数
r = safe_query('SELECT COUNT(*) as c FROM user_memory;')
stats['total_user_memories'] = r[0]['c'] if r else 'N/A'

# 虚空蔵ファイル数
r = safe_query('SELECT COUNT(*) as c FROM kokuzo_files;')
stats['kokuzo_files'] = r[0]['c'] if r else 'N/A'

# 虚空蔵チャンク数
r = safe_query('SELECT COUNT(*) as c FROM kokuzo_chunks;')
stats['kokuzo_chunks'] = r[0]['c'] if r else 'N/A'

# 虚空蔵シード数
r = safe_query('SELECT COUNT(*) as c FROM kokuzo_seeds;')
stats['kokuzo_seeds'] = r[0]['c'] if r else 'N/A'

# 虚空蔵コア件数
r = safe_query('SELECT COUNT(*) as c FROM kokuzo_core;')
stats['kokuzo_core_entries'] = r[0]['c'] if r else 'N/A'

# PWA スレッド数
r = safe_query('SELECT COUNT(*) as c FROM pwa_threads;')
stats['pwa_threads'] = r[0]['c'] if r else 'N/A'

# PWA メッセージ数
r = safe_query('SELECT COUNT(*) as c FROM pwa_messages;')
stats['pwa_messages'] = r[0]['c'] if r else 'N/A'

# ペルソナ状態
r = safe_query('SELECT COUNT(*) as c FROM persona_state;')
stats['persona_states'] = r[0]['c'] if r else 'N/A'

# 会話ログの日別分布（直近30日）
r = safe_query(\"\"\"
    SELECT date(created_at) as day, COUNT(*) as cnt
    FROM conversation_log
    WHERE created_at >= date('now', '-30 days')
    GROUP BY date(created_at)
    ORDER BY day DESC;
\"\"\")
stats['daily_conversation_last_30d'] = r if r else []

# 会話の平均長さ
r = safe_query('SELECT AVG(LENGTH(content)) as avg_len FROM conversation_log WHERE role=\"user\";')
stats['avg_user_message_length'] = round(r[0]['avg_len'], 1) if r and r[0].get('avg_len') else 'N/A'

r = safe_query('SELECT AVG(LENGTH(content)) as avg_len FROM conversation_log WHERE role=\"assistant\";')
stats['avg_assistant_message_length'] = round(r[0]['avg_len'], 1) if r and r[0].get('avg_len') else 'N/A'

output = {
    'timestamp': '$(date -u +%Y-%m-%dT%H:%M:%SZ)',
    'sqlite_stats': stats,
    'note': 'All personal data has been excluded. Only aggregate counts and distributions are reported.'
}

with open('$OUTPUT_DIR/founder_usage.json', 'w') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print('[collect_founder_usage] SQLite stats collected.', file=sys.stderr)
"
else
  echo "[collect_founder_usage] WARNING: SQLite DB not found, skipping." >&2
  echo '{"error":"SQLite DB not found","note":"Run on VPS with access to kokuzo.sqlite"}' > "$OUTPUT_DIR/founder_usage.json"
fi

# --- 2. nginx アクセスログからエンドポイント統計 ---
echo "[collect_founder_usage] Collecting API endpoint statistics from nginx logs..." >&2

ENDPOINT_FILE="$OUTPUT_DIR/founder_endpoint_usage.json"
python3 -c "
import json, re, os, sys
from collections import Counter

log_paths = [
    '/var/log/nginx/access.log',
    '/var/log/nginx/tenmon-ark.com.access.log',
]

endpoint_counter = Counter()
status_counter = Counter()
method_counter = Counter()
total_requests = 0

for log_path in log_paths:
    if not os.path.exists(log_path):
        continue
    try:
        with open(log_path) as f:
            for line in f:
                # nginx combined log format
                match = re.match(r'.*\"(\w+)\s+([^\s]+)\s+HTTP/[^\"]+\"\s+(\d+)', line)
                if match:
                    method, path, status = match.groups()
                    # パスからクエリパラメータとユーザーIDを除去
                    clean_path = re.sub(r'\?.*', '', path)
                    clean_path = re.sub(r'/[0-9a-f]{8,}', '/:id', clean_path)
                    clean_path = re.sub(r'/\d+', '/:num', clean_path)
                    endpoint_counter[f'{method} {clean_path}'] += 1
                    status_counter[status] += 1
                    method_counter[method] += 1
                    total_requests += 1
    except:
        pass

output = {
    'total_requests': total_requests,
    'top_endpoints': [{'endpoint': k, 'count': v} for k, v in endpoint_counter.most_common(50)],
    'status_distribution': dict(status_counter.most_common()),
    'method_distribution': dict(method_counter.most_common()),
    'log_files_checked': log_paths,
    'note': 'All user identifiers removed. Paths anonymized.'
}

with open('$ENDPOINT_FILE', 'w') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f'[collect_founder_usage] Endpoint stats: {total_requests} requests analyzed.', file=sys.stderr)
"

# --- 3. エラーパターン ---
echo "[collect_founder_usage] Collecting error patterns..." >&2

ERROR_FILE="$OUTPUT_DIR/founder_error_patterns.json"
python3 -c "
import json, re, os, sys
from collections import Counter

log_paths = [
    '/var/log/nginx/error.log',
    '/var/log/nginx/tenmon-ark.com.error.log',
]

error_counter = Counter()
total_errors = 0

for log_path in log_paths:
    if not os.path.exists(log_path):
        continue
    try:
        with open(log_path) as f:
            for line in f:
                # エラーメッセージの分類
                line_clean = re.sub(r'client: [0-9.]+', 'client: [IP]', line)
                line_clean = re.sub(r'server: [^\s,]+', 'server: [HOST]', line_clean)
                # エラータイプを抽出
                if 'upstream' in line_clean:
                    error_counter['upstream_error'] += 1
                elif '502' in line_clean:
                    error_counter['502_bad_gateway'] += 1
                elif '404' in line_clean:
                    error_counter['404_not_found'] += 1
                elif 'connect()' in line_clean:
                    error_counter['connection_error'] += 1
                elif 'timeout' in line_clean.lower():
                    error_counter['timeout'] += 1
                else:
                    error_counter['other'] += 1
                total_errors += 1
    except:
        pass

output = {
    'total_errors': total_errors,
    'error_types': dict(error_counter.most_common()),
    'log_files_checked': log_paths,
    'note': 'All IP addresses and hostnames masked.'
}

with open('$ERROR_FILE', 'w') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f'[collect_founder_usage] Error patterns: {total_errors} errors analyzed.', file=sys.stderr)
"

echo "[collect_founder_usage] Done." >&2
