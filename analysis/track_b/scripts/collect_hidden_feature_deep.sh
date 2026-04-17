#!/usr/bin/env bash
# ============================================================
# collect_hidden_feature_deep.sh — 隠れた機能の深部診断
# TENMON_ARK_FULL_SYSTEM_ANALYSIS_V1 / Track B / Part B.2
# ============================================================
# 目的: 13の埋もれた機能それぞれの個別診断データを収集
# 安全性:
#   - 全て SELECT のみ (READ-ONLY)
#   - PRAGMA busy_timeout=10000 (10秒上限)
#   - 個人情報は ANALYSIS_SALT でハッシュ化
# 出力: $OUTPUT_DIR/hidden_feature_evidence/01_learning_return.json ... 13_voice_systems.json
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/safe_query.sh"
source "${SCRIPT_DIR}/lib/mask_personal_info.sh"

OUTPUT_DIR="${OUTPUT_DIR:-${SCRIPT_DIR}/../output}"
EVIDENCE_DIR="$OUTPUT_DIR/hidden_feature_evidence"
mkdir -p "$EVIDENCE_DIR"

validate_salt

REPO_PATH="${REPO_PATH:-/opt/tenmon-ark-repo}"

echo "[collect_hidden_feature_deep] Starting 13-feature deep diagnosis..." >&2

python3 << 'PYEOF'
import json, subprocess, os, sys, glob, datetime, hashlib, re

# ---------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------
KOKUZO_DB = os.environ.get('KOKUZO_DB', '/opt/tenmon-ark-data/kokuzo.sqlite')
REPO_PATH = os.environ.get('REPO_PATH', '/opt/tenmon-ark-repo')
OUTPUT_DIR = os.environ.get('OUTPUT_DIR', '/opt/tenmon-ark-repo/analysis/track_b/output')
EVIDENCE_DIR = os.path.join(OUTPUT_DIR, 'hidden_feature_evidence')
SALT = os.environ.get('ANALYSIS_SALT', '')
SQLITE_TIMEOUT = 10000

os.makedirs(EVIDENCE_DIR, exist_ok=True)

def safe_query(sql):
    """READ-ONLY SQLite query"""
    try:
        result = subprocess.run(
            ['sqlite3', '-json', '-readonly', KOKUZO_DB,
             f'.timeout {SQLITE_TIMEOUT}', sql],
            capture_output=True, text=True, timeout=15
        )
        if result.returncode != 0 or not result.stdout.strip():
            return []
        return json.loads(result.stdout)
    except:
        return []

def safe_query_scalar(sql, default=0):
    """単一値を返すクエリ"""
    rows = safe_query(sql)
    if rows and len(rows) > 0:
        vals = list(rows[0].values())
        return vals[0] if vals else default
    return default

def table_exists(table_name):
    """テーブルの存在確認"""
    rows = safe_query(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}';")
    return len(rows) > 0

def count_recent(table, ts_col='created_at', days=1):
    """直近N日の行数"""
    cutoff = (datetime.datetime.utcnow() - datetime.timedelta(days=days)).strftime('%Y-%m-%d %H:%M:%S')
    return safe_query_scalar(
        f'SELECT COUNT(*) as cnt FROM "{table}" WHERE "{ts_col}" >= \'{cutoff}\';')

def find_files(pattern, extensions=('.ts', '.js')):
    """リポジトリ内でパターンに一致するファイルを検索"""
    found = []
    for ext in extensions:
        for f in glob.glob(os.path.join(REPO_PATH, '**', f'*{pattern}*{ext}'), recursive=True):
            if 'node_modules' not in f and '.git' not in f:
                found.append(f.replace(REPO_PATH + '/', ''))
    return found

def find_in_files(pattern, extensions=('.ts', '.js')):
    """リポジトリ内のファイル内容でパターンを検索"""
    found = []
    try:
        result = subprocess.run(
            ['grep', '-rl', '--include=*.ts', '--include=*.js',
             '-E', pattern, REPO_PATH],
            capture_output=True, text=True, timeout=15
        )
        for line in result.stdout.strip().split('\n'):
            if line and 'node_modules' not in line and '.git/' not in line:
                found.append(line.replace(REPO_PATH + '/', ''))
    except:
        pass
    return found

def check_service_status(svc_name):
    """systemdサービスの状態確認 (READ-ONLY)"""
    try:
        result = subprocess.run(['systemctl', 'is-active', svc_name],
                                capture_output=True, text=True, timeout=5)
        return result.stdout.strip()
    except:
        return 'unknown'

def check_journal_count(svc_name, pattern, days=7):
    """journalctlでパターンの出現回数を確認"""
    try:
        result = subprocess.run(
            ['journalctl', '-u', svc_name, '--since', f'{days} days ago',
             '--no-pager', '-o', 'cat'],
            capture_output=True, text=True, timeout=30
        )
        if pattern:
            return len(re.findall(pattern, result.stdout))
        return len(result.stdout.strip().split('\n')) if result.stdout.strip() else 0
    except:
        return 0

def check_endpoint_calls(endpoint_pattern, days=7):
    """nginxアクセスログでエンドポイント呼び出し数を確認"""
    try:
        result = subprocess.run(
            ['grep', '-c', endpoint_pattern, '/var/log/nginx/access.log'],
            capture_output=True, text=True, timeout=10
        )
        return int(result.stdout.strip()) if result.returncode == 0 else 0
    except:
        return 0

def write_feature(filename, data):
    """診断結果をJSONファイルに書き出す"""
    path = os.path.join(EVIDENCE_DIR, filename)
    with open(path, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f'  -> {filename}', file=sys.stderr)

# ===============================================================
# 5.1 Learning Return (学習還流)
# ===============================================================
print('[5.1] Learning Return...', file=sys.stderr)

training_sessions_exists = table_exists('training_sessions')
training_messages_exists = table_exists('training_messages')
kokuzo_synapses_exists = table_exists('kokuzo_synapses')
evolution_ledger_exists = table_exists('evolution_ledger_v1')

lr_data = {
    'feature_name': 'learning_return',
    'connection_status': 'absent',
    'evidence': {
        'files_found': find_files('training') + find_files('evolution') + find_files('learning'),
        'tables_with_data': [],
        'services_involved': [],
        'api_endpoints': find_in_files(r'training|evolution.*ledger|learning.*return'),
    },
    'activity': {
        'count_24h': 0, 'count_7d': 0, 'count_30d': 0, 'last_activity': None,
    },
    'diagnosis': {
        'working_as_designed': False,
        'root_cause_if_broken': '',
        'activation_difficulty': 'L',
    },
    'recommendation': '',
}

for tbl, exists in [('training_sessions', training_sessions_exists),
                     ('training_messages', training_messages_exists),
                     ('kokuzo_synapses', kokuzo_synapses_exists),
                     ('evolution_ledger_v1', evolution_ledger_exists)]:
    if exists:
        cnt = safe_query_scalar(f'SELECT COUNT(*) as cnt FROM "{tbl}";')
        if cnt > 0:
            lr_data['evidence']['tables_with_data'].append({'table': tbl, 'rows': cnt})
            # タイムスタンプカラムを探す
            for ts_col in ['created_at', 'createdAt', 'timestamp', 'ts']:
                try:
                    newest = safe_query_scalar(f'SELECT MAX("{ts_col}") as v FROM "{tbl}";', None)
                    if newest:
                        lr_data['activity']['last_activity'] = str(newest)
                        for days, key in [(1, 'count_24h'), (7, 'count_7d'), (30, 'count_30d')]:
                            lr_data['activity'][key] += count_recent(tbl, ts_col, days)
                        break
                except:
                    continue

# kokuzo_synapses への書き戻し痕跡
if kokuzo_synapses_exists:
    writeback = safe_query(
        "SELECT COUNT(*) as cnt FROM kokuzo_synapses WHERE source LIKE '%training%' OR source LIKE '%evolution%';")
    if writeback and writeback[0].get('cnt', 0) > 0:
        lr_data['evidence']['tables_with_data'].append(
            {'table': 'kokuzo_synapses (writeback)', 'rows': writeback[0]['cnt']})

if lr_data['evidence']['tables_with_data']:
    if lr_data['activity']['count_7d'] > 0:
        lr_data['connection_status'] = 'mainline'
        lr_data['diagnosis']['working_as_designed'] = True
    elif lr_data['activity']['count_30d'] > 0:
        lr_data['connection_status'] = 'partial'
        lr_data['diagnosis']['working_as_designed'] = 'partial'
    else:
        lr_data['connection_status'] = 'orphan'
        lr_data['diagnosis']['root_cause_if_broken'] = 'テーブルは存在するがアクティブな書き込みがない'
        lr_data['diagnosis']['activation_difficulty'] = 'M'
else:
    lr_data['diagnosis']['root_cause_if_broken'] = '学習還流テーブルが存在しないか空'
    lr_data['diagnosis']['activation_difficulty'] = 'L'

lr_data['recommendation'] = ('学習還流パイプラインの接続状態を確認し、'
    'training_sessions → kokuzo_synapses への書き戻しフローを有効化する')

write_feature('01_learning_return.json', lr_data)

# ===============================================================
# 5.2 Self-Audit / Self-Repair
# ===============================================================
print('[5.2] Self-Audit / Self-Repair...', file=sys.stderr)

sa_tables = {
    'tenmon_audit_log': table_exists('tenmon_audit_log'),
    'runtime_projection_audit_v1': table_exists('runtime_projection_audit_v1'),
    'reflection_queue_v1': table_exists('reflection_queue_v1'),
}

sa_data = {
    'feature_name': 'self_audit',
    'connection_status': 'absent',
    'evidence': {
        'files_found': find_files('audit') + find_files('reflection') + find_files('self.repair'),
        'tables_with_data': [],
        'services_involved': [],
        'api_endpoints': find_in_files(r'audit|reflection|self.repair'),
    },
    'activity': {'count_24h': 0, 'count_7d': 0, 'count_30d': 0, 'last_activity': None},
    'diagnosis': {'working_as_designed': False, 'root_cause_if_broken': '', 'activation_difficulty': 'M'},
    'recommendation': '',
}

for tbl, exists in sa_tables.items():
    if exists:
        cnt = safe_query_scalar(f'SELECT COUNT(*) as cnt FROM "{tbl}";')
        if cnt > 0:
            sa_data['evidence']['tables_with_data'].append({'table': tbl, 'rows': cnt})
            # 最新レコード詳細
            for ts_col in ['created_at', 'createdAt', 'timestamp']:
                newest = safe_query_scalar(f'SELECT MAX("{ts_col}") as v FROM "{tbl}";', None)
                if newest:
                    sa_data['activity']['last_activity'] = str(newest)
                    for days, key in [(1, 'count_24h'), (7, 'count_7d'), (30, 'count_30d')]:
                        sa_data['activity'][key] += count_recent(tbl, ts_col, days)
                    break

# reflection_queue pending count
if sa_tables.get('reflection_queue_v1'):
    pending = safe_query_scalar(
        "SELECT COUNT(*) as cnt FROM reflection_queue_v1 WHERE status='pending';")
    sa_data['evidence']['reflection_pending'] = pending

if sa_data['evidence']['tables_with_data']:
    sa_data['connection_status'] = 'partial' if sa_data['activity']['count_7d'] > 0 else 'orphan'
    sa_data['diagnosis']['working_as_designed'] = 'partial' if sa_data['activity']['count_7d'] > 0 else False
    sa_data['diagnosis']['root_cause_if_broken'] = '自己監査ログは記録されているが、自己修復フローが未接続の可能性'
else:
    sa_data['diagnosis']['root_cause_if_broken'] = '監査テーブルが存在しないか空'

sa_data['recommendation'] = '自己監査ログの定期実行と、reflection_queue からの自動修復フローを構築する'
write_feature('02_self_audit.json', sa_data)

# ===============================================================
# 5.3 Continuity / 継続記憶層
# ===============================================================
print('[5.3] Continuity...', file=sys.stderr)

cont_data = {
    'feature_name': 'continuity',
    'connection_status': 'absent',
    'evidence': {
        'files_found': find_files('memory') + find_files('continuity') + find_files('thread'),
        'tables_with_data': [],
        'services_involved': [],
        'api_endpoints': find_in_files(r'memory_unit|thread_link|continuity'),
    },
    'activity': {'count_24h': 0, 'count_7d': 0, 'count_30d': 0, 'last_activity': None},
    'diagnosis': {'working_as_designed': False, 'root_cause_if_broken': '', 'activation_difficulty': 'M'},
    'recommendation': '',
}

for tbl in ['memory_units', 'thread_links', 'conversation_memory', 'sessions']:
    if table_exists(tbl):
        cnt = safe_query_scalar(f'SELECT COUNT(*) as cnt FROM "{tbl}";')
        if cnt > 0:
            cont_data['evidence']['tables_with_data'].append({'table': tbl, 'rows': cnt})
            for ts_col in ['created_at', 'createdAt', 'timestamp', 'updated_at']:
                newest = safe_query_scalar(f'SELECT MAX("{ts_col}") as v FROM "{tbl}";', None)
                if newest:
                    if not cont_data['activity']['last_activity'] or str(newest) > str(cont_data['activity']['last_activity']):
                        cont_data['activity']['last_activity'] = str(newest)
                    for days, key in [(1, 'count_24h'), (7, 'count_7d'), (30, 'count_30d')]:
                        cont_data['activity'][key] += count_recent(tbl, ts_col, days)
                    break

# thread_links のグラフ深度
if table_exists('thread_links'):
    max_depth = safe_query_scalar("SELECT MAX(depth) as v FROM thread_links;", None)
    cont_data['evidence']['max_thread_depth'] = max_depth

if cont_data['evidence']['tables_with_data']:
    if cont_data['activity']['count_24h'] > 0:
        cont_data['connection_status'] = 'mainline'
        cont_data['diagnosis']['working_as_designed'] = True
    elif cont_data['activity']['count_7d'] > 0:
        cont_data['connection_status'] = 'partial'
        cont_data['diagnosis']['working_as_designed'] = 'partial'
    else:
        cont_data['connection_status'] = 'orphan'
else:
    cont_data['diagnosis']['root_cause_if_broken'] = '継続記憶テーブルが存在しないか空'

cont_data['recommendation'] = '継続記憶層のINSERT/SELECTバランスを確認し、会話間の記憶参照を有効化する'
write_feature('03_continuity.json', cont_data)

# ===============================================================
# 5.4 RouteReason / Evidence Bind
# ===============================================================
print('[5.4] RouteReason / Evidence Bind...', file=sys.stderr)

rr_data = {
    'feature_name': 'route_evidence',
    'connection_status': 'absent',
    'evidence': {
        'files_found': find_files('routeReason') + find_files('evidence') + find_files('synapse'),
        'tables_with_data': [],
        'services_involved': [],
        'api_endpoints': find_in_files(r'routeReason|evidence.*pack|synapse_log'),
        'kotodama_connector': {
            'exists_on_disk': os.path.isfile(os.path.join(REPO_PATH, 'api/src/kotodama/kotodamaConnector.ts')),
            'git_tracked': False,
            'analysis': 'kotodamaConnector.ts が git untracked の場合、言霊発火ゼロの核心原因の可能性',
        },
    },
    'activity': {'count_24h': 0, 'count_7d': 0, 'count_30d': 0, 'last_activity': None},
    'diagnosis': {'working_as_designed': False, 'root_cause_if_broken': '', 'activation_difficulty': 'M'},
    'recommendation': '',
}

# kotodamaConnector.ts の git tracked 状態
try:
    result = subprocess.run(
        ['git', '-C', REPO_PATH, 'ls-files', 'api/src/kotodama/kotodamaConnector.ts'],
        capture_output=True, text=True, timeout=5)
    rr_data['evidence']['kotodama_connector']['git_tracked'] = bool(result.stdout.strip())
except:
    pass

# synapse_log テーブル
for tbl in ['synapse_log', 'synapse_logs', 'kokuzo_synapses']:
    if table_exists(tbl):
        cnt = safe_query_scalar(f'SELECT COUNT(*) as cnt FROM "{tbl}";')
        if cnt > 0:
            rr_data['evidence']['tables_with_data'].append({'table': tbl, 'rows': cnt})
            # routeReason 値の分布
            route_dist = safe_query(
                f'SELECT routeReason, COUNT(*) as cnt FROM "{tbl}" '
                f'WHERE routeReason IS NOT NULL GROUP BY routeReason ORDER BY cnt DESC LIMIT 20;')
            if route_dist:
                rr_data['evidence']['routeReason_distribution'] = route_dist
            for ts_col in ['created_at', 'createdAt', 'timestamp']:
                newest = safe_query_scalar(f'SELECT MAX("{ts_col}") as v FROM "{tbl}";', None)
                if newest:
                    rr_data['activity']['last_activity'] = str(newest)
                    for days, key in [(1, 'count_24h'), (7, 'count_7d'), (30, 'count_30d')]:
                        rr_data['activity'][key] += count_recent(tbl, ts_col, days)
                    break

# nginx ログの /api/chat 呼び出しに evidence 含有率
evidence_in_chat = check_endpoint_calls('/api/chat')
rr_data['evidence']['api_chat_calls_total'] = evidence_in_chat

if rr_data['evidence']['tables_with_data']:
    if rr_data['activity']['count_24h'] > 0:
        rr_data['connection_status'] = 'mainline'
        rr_data['diagnosis']['working_as_designed'] = True
    else:
        rr_data['connection_status'] = 'partial'
        rr_data['diagnosis']['working_as_designed'] = 'partial'
else:
    rr_data['diagnosis']['root_cause_if_broken'] = 'synapse_log テーブルが存在しないか、routeReason が未記録'

rr_data['recommendation'] = ('kotodamaConnector.ts を git に追加し、'
    'routeReason + evidence bind の接続を復旧する。言霊発火ゼロの根本原因調査を優先。')
write_feature('04_route_evidence.json', rr_data)

# ===============================================================
# 5.5 Notion 同期
# ===============================================================
print('[5.5] Notion Sync...', file=sys.stderr)

ns_data = {
    'feature_name': 'notion_sync',
    'connection_status': 'absent',
    'evidence': {
        'files_found': find_files('notion') + find_files('Notion'),
        'tables_with_data': [],
        'services_involved': [],
        'api_endpoints': find_in_files(r'notion|Notion'),
    },
    'activity': {'count_24h': 0, 'count_7d': 0, 'count_30d': 0, 'last_activity': None},
    'diagnosis': {'working_as_designed': False, 'root_cause_if_broken': '', 'activation_difficulty': 'M'},
    'recommendation': '',
}

# notion-task-* サービス
for svc in ['notion-task', 'tenmon-notion', 'notion-sync']:
    status = check_service_status(svc)
    if status != 'unknown' and status != 'inactive':
        ns_data['evidence']['services_involved'].append({'name': svc, 'status': status})

# Notion関連テーブル
for tbl in ['notion_pages', 'notion_cache', 'notion_sync_log', 'notion_tasks']:
    if table_exists(tbl):
        cnt = safe_query_scalar(f'SELECT COUNT(*) as cnt FROM "{tbl}";')
        if cnt > 0:
            ns_data['evidence']['tables_with_data'].append({'table': tbl, 'rows': cnt})

if ns_data['evidence']['tables_with_data'] or ns_data['evidence']['services_involved']:
    ns_data['connection_status'] = 'partial'
    ns_data['diagnosis']['working_as_designed'] = 'partial'
else:
    ns_data['diagnosis']['root_cause_if_broken'] = 'Notion同期サービスまたはテーブルが未構築'

ns_data['recommendation'] = 'Notion同期の最終タイムスタンプを確認し、定期同期ジョブを有効化する'
write_feature('05_notion_sync.json', ns_data)

# ===============================================================
# 5.6 Founder 導線
# ===============================================================
print('[5.6] Founder Onboarding...', file=sys.stderr)

fo_data = {
    'feature_name': 'founder_onboarding',
    'connection_status': 'absent',
    'evidence': {
        'files_found': find_files('register') + find_files('invite') + find_files('onboard'),
        'tables_with_data': [],
        'services_involved': [],
        'api_endpoints': find_in_files(r'/api/register|/api/invite|/api/auth'),
    },
    'activity': {'count_24h': 0, 'count_7d': 0, 'count_30d': 0, 'last_activity': None},
    'diagnosis': {'working_as_designed': False, 'root_cause_if_broken': '', 'activation_difficulty': 'S'},
    'recommendation': '',
}

# エンドポイント呼び出し数
for ep in ['/api/register', '/api/invite', '/api/auth/password-reset', '/api/auth']:
    calls = check_endpoint_calls(ep)
    fo_data['evidence'][f'endpoint_{ep}_calls'] = calls

# users テーブル
for tbl in ['users', 'user', 'accounts']:
    if table_exists(tbl):
        cnt = safe_query_scalar(f'SELECT COUNT(*) as cnt FROM "{tbl}";')
        if cnt > 0:
            fo_data['evidence']['tables_with_data'].append({'table': tbl, 'rows': cnt})

if fo_data['evidence']['tables_with_data']:
    fo_data['connection_status'] = 'mainline'
    fo_data['diagnosis']['working_as_designed'] = True
else:
    fo_data['diagnosis']['root_cause_if_broken'] = 'ユーザーテーブルが存在しないか空'

fo_data['recommendation'] = '認証フローの完了率を測定し、LP→登録のドロップオフポイントを特定する'
write_feature('06_founder_onboarding.json', fo_data)

# ===============================================================
# 5.7 PWA Import/Export
# ===============================================================
print('[5.7] PWA Import/Export...', file=sys.stderr)

ie_data = {
    'feature_name': 'pwa_import_export',
    'connection_status': 'absent',
    'evidence': {
        'files_found': find_files('export') + find_files('import'),
        'tables_with_data': [],
        'services_involved': [],
        'api_endpoints': find_in_files(r'/api/export|/api/import'),
    },
    'activity': {'count_24h': 0, 'count_7d': 0, 'count_30d': 0, 'last_activity': None},
    'diagnosis': {'working_as_designed': False, 'root_cause_if_broken': '', 'activation_difficulty': 'M'},
    'recommendation': '',
}

for ep in ['/api/export', '/api/import']:
    ie_data['evidence'][f'endpoint_{ep}_calls'] = check_endpoint_calls(ep)

if ie_data['evidence']['files_found']:
    ie_data['connection_status'] = 'partial'
    ie_data['diagnosis']['working_as_designed'] = 'partial'
    ie_data['diagnosis']['root_cause_if_broken'] = '実装ファイルは存在するがエンドポイント呼び出しが少ない可能性'
else:
    ie_data['diagnosis']['root_cause_if_broken'] = 'import/export 実装ファイルが見つからない'

ie_data['recommendation'] = 'PWAのデータエクスポート/インポート機能の実装状態を確認し、UIからの導線を構築する'
write_feature('07_pwa_import_export.json', ie_data)

# ===============================================================
# 5.8 Seed 圧縮 / 知識パック
# ===============================================================
print('[5.8] Seed Compression...', file=sys.stderr)

seed_data = {
    'feature_name': 'seed_compression',
    'connection_status': 'absent',
    'evidence': {
        'files_found': find_files('seed') + find_files('compress') + find_files('knowledge.pack'),
        'tables_with_data': [],
        'services_involved': [],
        'api_endpoints': find_in_files(r'seed|compress|knowledge.*pack'),
    },
    'activity': {'count_24h': 0, 'count_7d': 0, 'count_30d': 0, 'last_activity': None},
    'diagnosis': {'working_as_designed': False, 'root_cause_if_broken': '', 'activation_difficulty': 'L'},
    'recommendation': '',
}

for tbl in ['seeds', 'seed_cache', 'knowledge_packs', 'deep_seeds']:
    if table_exists(tbl):
        cnt = safe_query_scalar(f'SELECT COUNT(*) as cnt FROM "{tbl}";')
        if cnt > 0:
            seed_data['evidence']['tables_with_data'].append({'table': tbl, 'rows': cnt})

if seed_data['evidence']['tables_with_data'] or seed_data['evidence']['files_found']:
    seed_data['connection_status'] = 'partial'
else:
    seed_data['diagnosis']['root_cause_if_broken'] = 'Seed圧縮/知識パック機能が未実装または未接続'

seed_data['recommendation'] = '深化Seed生成ロジックを実装し、知識パックの圧縮・展開フローを構築する'
write_feature('08_seed_compression.json', seed_data)

# ===============================================================
# 5.9 履歴/憲法レイヤー
# ===============================================================
print('[5.9] Constitution Layer...', file=sys.stderr)

const_data = {
    'feature_name': 'constitution_layer',
    'connection_status': 'absent',
    'evidence': {
        'files_found': find_files('constitution') + find_files('Constitution'),
        'tables_with_data': [],
        'services_involved': [],
        'api_endpoints': find_in_files(r'constitution|CONSTITUTION'),
    },
    'activity': {'count_24h': 0, 'count_7d': 0, 'count_30d': 0, 'last_activity': None},
    'diagnosis': {'working_as_designed': False, 'root_cause_if_broken': '', 'activation_difficulty': 'M'},
    'recommendation': '',
}

for tbl in ['constitution', 'constitutions', 'constitution_versions', 'constitution_compiler']:
    if table_exists(tbl):
        cnt = safe_query_scalar(f'SELECT COUNT(*) as cnt FROM "{tbl}";')
        if cnt > 0:
            const_data['evidence']['tables_with_data'].append({'table': tbl, 'rows': cnt})

# CONSTITUTION_COMPILER_V1 の呼び出し痕跡
compiler_refs = find_in_files(r'CONSTITUTION_COMPILER|constitution.*compiler')
const_data['evidence']['compiler_references'] = compiler_refs

if const_data['evidence']['files_found'] or const_data['evidence']['tables_with_data']:
    const_data['connection_status'] = 'partial'
    const_data['diagnosis']['working_as_designed'] = 'partial'
else:
    const_data['diagnosis']['root_cause_if_broken'] = '憲法レイヤーのテーブルまたは実装が未構築'

const_data['recommendation'] = 'CONSTITUTION_COMPILER_V1 の呼び出しフローを確認し、憲法の自動更新メカニズムを構築する'
write_feature('09_constitution_layer.json', const_data)

# ===============================================================
# 5.10 ハイブリッド LLM 切替
# ===============================================================
print('[5.10] Hybrid LLM...', file=sys.stderr)

llm_data = {
    'feature_name': 'hybrid_llm',
    'connection_status': 'absent',
    'evidence': {
        'files_found': find_files('llm') + find_files('LLM') + find_files('openai') + find_files('claude'),
        'tables_with_data': [],
        'services_involved': [],
        'api_endpoints': find_in_files(r'gpt-4|claude|gemini|llm.*switch|model.*select'),
    },
    'activity': {'count_24h': 0, 'count_7d': 0, 'count_30d': 0, 'last_activity': None},
    'diagnosis': {'working_as_designed': False, 'root_cause_if_broken': '', 'activation_difficulty': 'S'},
    'recommendation': '',
}

# synapse_log の llm フィールド分布
for tbl in ['synapse_log', 'synapse_logs', 'kokuzo_synapses']:
    if table_exists(tbl):
        llm_dist = safe_query(
            f'SELECT llm, COUNT(*) as cnt FROM "{tbl}" '
            f'WHERE llm IS NOT NULL GROUP BY llm ORDER BY cnt DESC LIMIT 10;')
        if llm_dist:
            llm_data['evidence']['llm_distribution'] = llm_dist
            llm_data['evidence']['tables_with_data'].append({'table': tbl, 'field': 'llm'})

# LLM切替ロジック
switch_files = find_in_files(r'model.*switch|llm.*select|fallback.*model|model.*fallback')
llm_data['evidence']['switch_logic_files'] = switch_files

if llm_data['evidence'].get('llm_distribution'):
    if len(llm_data['evidence']['llm_distribution']) > 1:
        llm_data['connection_status'] = 'mainline'
        llm_data['diagnosis']['working_as_designed'] = True
    else:
        llm_data['connection_status'] = 'partial'
        llm_data['diagnosis']['working_as_designed'] = 'partial'
        llm_data['diagnosis']['root_cause_if_broken'] = '単一LLMのみ使用されている'
else:
    llm_data['diagnosis']['root_cause_if_broken'] = 'LLM使用ログが記録されていないか、テーブルが存在しない'

llm_data['recommendation'] = 'ハイブリッドLLM切替ロジックを確認し、コスト/品質に基づく自動切替を有効化する'
write_feature('10_hybrid_llm.json', llm_data)

# ===============================================================
# 5.11 時事情報取得
# ===============================================================
print('[5.11] Live Web Search...', file=sys.stderr)

web_data = {
    'feature_name': 'live_web_search',
    'connection_status': 'absent',
    'evidence': {
        'files_found': find_files('web.search') + find_files('live.search') + find_files('search'),
        'tables_with_data': [],
        'services_involved': [],
        'api_endpoints': find_in_files(r'web.*search|live.*search|search.*api'),
    },
    'activity': {'count_24h': 0, 'count_7d': 0, 'count_30d': 0, 'last_activity': None},
    'diagnosis': {'working_as_designed': False, 'root_cause_if_broken': '', 'activation_difficulty': 'M'},
    'recommendation': '',
}

# evidence pack での web 結果含有率
web_in_evidence = find_in_files(r'web_result|search_result|live_data')
web_data['evidence']['web_in_evidence_files'] = web_in_evidence

if web_data['evidence']['files_found'] or web_data['evidence']['api_endpoints']:
    web_data['connection_status'] = 'partial'
    web_data['diagnosis']['working_as_designed'] = 'partial'
else:
    web_data['diagnosis']['root_cause_if_broken'] = '時事情報取得機能が未実装'

web_data['recommendation'] = 'Web検索APIの統合を実装し、evidence packに時事情報を含める'
write_feature('11_live_web_search.json', web_data)

# ===============================================================
# 5.12 宿曜以外の深層アルゴリズム
# ===============================================================
print('[5.12] Alternative Algorithms...', file=sys.stderr)

alt_data = {
    'feature_name': 'alternative_algorithms',
    'connection_status': 'absent',
    'evidence': {
        'files_found': (find_files('nine.star') + find_files('kigaku') +
                       find_files('gogyou') + find_files('gogyo') +
                       find_files('kyusei')),
        'tables_with_data': [],
        'services_involved': [],
        'api_endpoints': find_in_files(r'nine.*star|kigaku|gogyou|gogyo|kyusei|九星'),
    },
    'activity': {'count_24h': 0, 'count_7d': 0, 'count_30d': 0, 'last_activity': None},
    'diagnosis': {'working_as_designed': False, 'root_cause_if_broken': '', 'activation_difficulty': 'M'},
    'recommendation': '',
}

for tbl in ['nine_star', 'kigaku', 'gogyou', 'gogyo', 'kyusei_data',
            'nine_star_kigaku', 'gogyo_elements']:
    if table_exists(tbl):
        cnt = safe_query_scalar(f'SELECT COUNT(*) as cnt FROM "{tbl}";')
        if cnt > 0:
            alt_data['evidence']['tables_with_data'].append({'table': tbl, 'rows': cnt})

if alt_data['evidence']['tables_with_data'] or alt_data['evidence']['files_found']:
    alt_data['connection_status'] = 'partial'
    alt_data['diagnosis']['working_as_designed'] = 'partial'
else:
    alt_data['diagnosis']['root_cause_if_broken'] = '九星×宿曜DBまたは五行関連テーブルが未構築'

alt_data['recommendation'] = '宿曜以外の深層アルゴリズム（九星気学・五行）のデータ統合を進める'
write_feature('12_alternative_algorithms.json', alt_data)

# ===============================================================
# 5.13 音声系
# ===============================================================
print('[5.13] Voice Systems...', file=sys.stderr)

voice_data = {
    'feature_name': 'voice_systems',
    'connection_status': 'absent',
    'evidence': {
        'files_found': (find_files('voice') + find_files('audio') +
                       find_files('tts') + find_files('stt') +
                       find_files('speech')),
        'tables_with_data': [],
        'services_involved': [],
        'api_endpoints': find_in_files(r'/api/voice|tts|stt|speech|audio'),
    },
    'activity': {'count_24h': 0, 'count_7d': 0, 'count_30d': 0, 'last_activity': None},
    'diagnosis': {'working_as_designed': False, 'root_cause_if_broken': '', 'activation_difficulty': 'M'},
    'recommendation': '',
}

# /api/voice/* の呼び出し痕跡
voice_calls = check_endpoint_calls('/api/voice')
voice_data['evidence']['voice_api_calls'] = voice_calls

# 音声関連テーブル
for tbl in ['voice_sessions', 'audio_files', 'tts_cache', 'stt_results',
            'kotodama_analysis']:
    if table_exists(tbl):
        cnt = safe_query_scalar(f'SELECT COUNT(*) as cnt FROM "{tbl}";')
        if cnt > 0:
            voice_data['evidence']['tables_with_data'].append({'table': tbl, 'rows': cnt})

# server/ark/kotodamaEngine.ts の存在確認 (音声パイプライン)
kotodama_engine = os.path.join(REPO_PATH, 'server/ark/kotodamaEngine.ts')
voice_data['evidence']['kotodama_engine_exists'] = os.path.isfile(kotodama_engine)

if voice_data['evidence']['files_found'] or voice_data['evidence']['tables_with_data']:
    voice_data['connection_status'] = 'partial'
    voice_data['diagnosis']['working_as_designed'] = 'partial'
    voice_data['diagnosis']['root_cause_if_broken'] = '音声ファイルは存在するが、エンドポイントの接続が不完全な可能性'
else:
    voice_data['diagnosis']['root_cause_if_broken'] = '音声系の実装が未構築'

voice_data['recommendation'] = '音声パイプライン（TTS/STT）の統合状態を確認し、kotodamaEngine との接続を有効化する'
write_feature('13_voice_systems.json', voice_data)

# ===============================================================
# Summary
# ===============================================================
print(f'\n[collect_hidden_feature_deep] All 13 features diagnosed.', file=sys.stderr)
features = [
    '01_learning_return', '02_self_audit', '03_continuity',
    '04_route_evidence', '05_notion_sync', '06_founder_onboarding',
    '07_pwa_import_export', '08_seed_compression', '09_constitution_layer',
    '10_hybrid_llm', '11_live_web_search', '12_alternative_algorithms',
    '13_voice_systems'
]
for fname in features:
    path = os.path.join(EVIDENCE_DIR, f'{fname}.json')
    if os.path.isfile(path):
        with open(path) as f:
            data = json.load(f)
        status = data.get('connection_status', 'unknown')
        print(f'  {fname}: {status}', file=sys.stderr)

PYEOF

echo "[collect_hidden_feature_deep] Output: $EVIDENCE_DIR/" >&2
