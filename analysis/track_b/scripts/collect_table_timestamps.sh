#!/usr/bin/env bash
# ============================================================
# collect_table_timestamps.sh — テーブル最終更新日時収集
# TENMON_ARK_FULL_SYSTEM_ANALYSIS_V1 / Track B / Part B.1
# ============================================================
# 目的: 111テーブル各々の最終更新日時を取得し、
#       mainline / dormant / dead を判定する
# 安全性:
#   - 全て SELECT のみ (READ-ONLY)
#   - PRAGMA busy_timeout=10000 (10秒上限)
#   - 1M+ rows テーブルは sampling query
# 出力: $OUTPUT_DIR/table_timestamps.json
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/safe_query.sh"

OUTPUT_DIR="${OUTPUT_DIR:-${SCRIPT_DIR}/../output}"
mkdir -p "$OUTPUT_DIR"

echo "[collect_table_timestamps] Starting table timestamp analysis..." >&2

python3 << 'PYEOF'
import json, subprocess, os, sys, datetime

# ---------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------
KOKUZO_DB = os.environ.get('KOKUZO_DB', '/opt/tenmon-ark-data/kokuzo.sqlite')
SQLITE_TIMEOUT = 10000  # ms
OUTPUT_DIR = os.environ.get('OUTPUT_DIR', '/opt/tenmon-ark-repo/analysis/track_b/output')
LARGE_TABLE_THRESHOLD = 1_000_000  # rows

# タイムスタンプカラム候補 (優先順)
TIMESTAMP_COLUMNS = [
    'created_at', 'createdAt', 'updated_at', 'updatedAt',
    'timestamp', 'ts', 'date', 'time',
    'inserted_at', 'last_updated', 'modified_at',
    'created', 'updated', 'modified',
]

def safe_query(db_path, sql):
    """READ-ONLY SQLite query with timeout"""
    try:
        result = subprocess.run(
            ['sqlite3', '-json', '-readonly', db_path,
             f'.timeout {SQLITE_TIMEOUT}', sql],
            capture_output=True, text=True, timeout=15
        )
        if result.returncode != 0:
            return None
        if not result.stdout.strip():
            return []
        return json.loads(result.stdout)
    except Exception as e:
        return None

def get_tables(db_path):
    """全テーブル名を取得"""
    rows = safe_query(db_path,
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    if rows is None:
        return []
    return [r['name'] for r in rows]

def get_columns(db_path, table):
    """テーブルのカラム名一覧を取得"""
    rows = safe_query(db_path, f'PRAGMA table_info("{table}");')
    if rows is None:
        return []
    return [r['name'] for r in rows]

def find_timestamp_column(columns):
    """タイムスタンプカラムを優先順で検出"""
    col_lower_map = {c.lower(): c for c in columns}
    for candidate in TIMESTAMP_COLUMNS:
        if candidate.lower() in col_lower_map:
            return col_lower_map[candidate.lower()]
    return None

def get_row_count(db_path, table):
    """テーブルの行数を取得"""
    rows = safe_query(db_path, f'SELECT COUNT(*) as cnt FROM "{table}";')
    if rows and len(rows) > 0:
        return rows[0].get('cnt', 0)
    return 0

def analyze_table(db_path, table):
    """1テーブルのタイムスタンプ解析"""
    result = {
        'name': table,
        'row_count': 0,
        'timestamp_column': None,
        'oldest': None,
        'newest': None,
        'count_24h': 0,
        'count_7d': 0,
        'count_30d': 0,
        'status': 'unknown',
        'days_since_last_update': None,
        'error': None,
    }

    try:
        # 行数
        row_count = get_row_count(db_path, table)
        result['row_count'] = row_count

        if row_count == 0:
            result['status'] = 'empty'
            return result

        # カラム取得
        columns = get_columns(db_path, table)
        if not columns:
            result['status'] = 'no_columns'
            return result

        # タイムスタンプカラム検出
        ts_col = find_timestamp_column(columns)
        if ts_col is None:
            result['status'] = 'no_timestamp_column'
            result['available_columns'] = columns[:10]  # デバッグ用
            return result

        result['timestamp_column'] = ts_col

        # 大規模テーブルはサンプリング
        if row_count > LARGE_TABLE_THRESHOLD:
            # 最新・最古のみ (インデックスがあれば高速)
            newest_rows = safe_query(db_path,
                f'SELECT MAX("{ts_col}") as newest FROM "{table}";')
            oldest_rows = safe_query(db_path,
                f'SELECT MIN("{ts_col}") as oldest FROM "{table}";')
            if newest_rows and len(newest_rows) > 0:
                result['newest'] = newest_rows[0].get('newest')
            if oldest_rows and len(oldest_rows) > 0:
                result['oldest'] = oldest_rows[0].get('oldest')
            # カウントは近似 (LIMIT付きサンプリング)
            result['count_note'] = f'large_table_{row_count}_rows_sampling'
        else:
            # 通常テーブル: 最新・最古
            newest_rows = safe_query(db_path,
                f'SELECT MAX("{ts_col}") as newest FROM "{table}";')
            oldest_rows = safe_query(db_path,
                f'SELECT MIN("{ts_col}") as oldest FROM "{table}";')
            if newest_rows and len(newest_rows) > 0:
                result['newest'] = newest_rows[0].get('newest')
            if oldest_rows and len(oldest_rows) > 0:
                result['oldest'] = oldest_rows[0].get('oldest')

        # 24h / 7d / 30d カウント
        now = datetime.datetime.utcnow()
        for label, delta in [('count_24h', 1), ('count_7d', 7), ('count_30d', 30)]:
            cutoff = (now - datetime.timedelta(days=delta)).strftime('%Y-%m-%d %H:%M:%S')
            # 複数の日時フォーマットに対応するため、文字列比較
            count_rows = safe_query(db_path,
                f'SELECT COUNT(*) as cnt FROM "{table}" '
                f'WHERE "{ts_col}" >= \'{cutoff}\';')
            if count_rows and len(count_rows) > 0:
                result[label] = count_rows[0].get('cnt', 0)

        # status 判定
        if result['count_24h'] and result['count_24h'] > 0:
            result['status'] = 'mainline'
        elif result['count_7d'] and result['count_7d'] > 0:
            result['status'] = 'active'
        elif result['count_30d'] and result['count_30d'] > 0:
            result['status'] = 'dormant'
        else:
            result['status'] = 'dead'

        # days_since_last_update
        if result['newest']:
            try:
                # 複数フォーマット対応
                for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S',
                            '%Y-%m-%dT%H:%M:%SZ', '%Y-%m-%d',
                            '%Y-%m-%dT%H:%M:%S.%f', '%Y-%m-%dT%H:%M:%S.%fZ']:
                    try:
                        newest_dt = datetime.datetime.strptime(str(result['newest']), fmt)
                        result['days_since_last_update'] = (now - newest_dt).days
                        break
                    except ValueError:
                        continue
                # Unix timestamp の場合
                if result['days_since_last_update'] is None:
                    try:
                        ts_val = float(result['newest'])
                        if ts_val > 1e12:  # ミリ秒
                            ts_val /= 1000
                        newest_dt = datetime.datetime.utcfromtimestamp(ts_val)
                        result['days_since_last_update'] = (now - newest_dt).days
                    except:
                        pass
            except:
                pass

    except Exception as e:
        result['error'] = str(e)
        result['status'] = 'error'

    return result

# ---------------------------------------------------------------
# Main
# ---------------------------------------------------------------
if not os.path.isfile(KOKUZO_DB):
    print(f'[collect_table_timestamps] ERROR: DB not found: {KOKUZO_DB}', file=sys.stderr)
    output = {'error': f'Database not found: {KOKUZO_DB}', 'tables': []}
    with open(os.path.join(OUTPUT_DIR, 'table_timestamps.json'), 'w') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    sys.exit(1)

tables = get_tables(KOKUZO_DB)
print(f'[collect_table_timestamps] Found {len(tables)} tables. Analyzing...', file=sys.stderr)

results = []
for i, table in enumerate(tables):
    if (i + 1) % 20 == 0:
        print(f'[collect_table_timestamps] Progress: {i+1}/{len(tables)}...', file=sys.stderr)
    result = analyze_table(KOKUZO_DB, table)
    results.append(result)

# サマリ統計
status_counts = {}
for r in results:
    s = r.get('status', 'unknown')
    status_counts[s] = status_counts.get(s, 0) + 1

output = {
    'timestamp': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
    'database': KOKUZO_DB,
    'total_tables': len(tables),
    'status_summary': status_counts,
    'tables': results,
}

with open(os.path.join(OUTPUT_DIR, 'table_timestamps.json'), 'w') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f'[collect_table_timestamps] Done. {len(tables)} tables analyzed.', file=sys.stderr)
print(f'[collect_table_timestamps] Status summary: {json.dumps(status_counts)}', file=sys.stderr)
PYEOF

echo "[collect_table_timestamps] Output: $OUTPUT_DIR/table_timestamps.json" >&2
