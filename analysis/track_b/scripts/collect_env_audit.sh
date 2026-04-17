#!/usr/bin/env bash
# ============================================================
# collect_env_audit.sh — 環境変数監査スクリプト
# TENMON_ARK_FULL_SYSTEM_ANALYSIS_V1 / Track B
# ============================================================
# 収集対象:
#   - .env ファイルの変数名と値の長さ（値自体は含めない）
#   - systemd drop-in 形式 (Environment=KEY=VALUE) に対応
#   - 秘匿値 (API_KEY/TOKEN/SECRET/PASSWORD等) は長さも出さず [MASKED]
#   - Node.js / npm / pnpm バージョン
#   - OS 情報
#   - systemd EnvironmentFile の参照先
# 出力: $OUTPUT_DIR/env_audit.json
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/mask_personal_info.sh"

OUTPUT_DIR="${OUTPUT_DIR:-${SCRIPT_DIR}/../output}"
mkdir -p "$OUTPUT_DIR"

validate_salt

echo "[collect_env_audit] Starting environment audit..." >&2

python3 << 'PYEOF'
import json, subprocess, os, re, sys, glob

# ---------------------------------------------------------------
# 秘匿値パターン: これらを含む変数名は値の長さも出さない
# ---------------------------------------------------------------
SECRET_PATTERNS = re.compile(
    r'(API_KEY|KEY|TOKEN|SECRET|PASSWORD|PASS|AUTH|DATABASE_URL|DB_URL)',
    re.IGNORECASE
)

def is_secret_var(key):
    """変数名が秘匿値パターンに該当するか"""
    return bool(SECRET_PATTERNS.search(key))

def parse_env_line(line):
    """1行をパースして (key, value) を返す。コメント/空行は None"""
    line = line.strip()
    if not line or line.startswith('#'):
        return None
    # systemd drop-in 形式: Environment=KEY=VALUE or Environment="KEY=VALUE"
    if line.startswith('Environment='):
        line = line[len('Environment='):]
        if line.startswith('"') and line.endswith('"'):
            line = line[1:-1]
    if '=' not in line:
        return None
    key, _, value = line.partition('=')
    key = key.strip()
    value = value.strip().strip('"').strip("'")
    return (key, value)

def mask_env_file(filepath):
    """envファイルの変数名と値の長さのみ記録（秘匿値は [MASKED]）"""
    if not os.path.exists(filepath):
        return {'error': f'File not found: {filepath}'}
    if os.path.isdir(filepath):
        return {'error': f'Path is a directory, not a file: {filepath}'}
    result = []
    try:
        with open(filepath) as f:
            for line in f:
                parsed = parse_env_line(line)
                if parsed is None:
                    continue
                key, value = parsed
                if is_secret_var(key):
                    result.append({
                        'name': key,
                        'is_set': bool(value),
                        'length': '[MASKED]',
                        'looks_like': 'secret/token'
                    })
                else:
                    result.append({
                        'name': key,
                        'is_set': bool(value),
                        'length': len(value),
                        'looks_like': classify_value(key, value)
                    })
    except PermissionError:
        return {'error': f'Permission denied: {filepath}'}
    except Exception as e:
        return {'error': f'Unexpected error: {str(e)}'}
    return result

def classify_value(key, value):
    """値の種類を推定（値自体は含めない）"""
    key_lower = key.lower()
    if 'url' in key_lower or 'host' in key_lower or 'endpoint' in key_lower:
        return 'url/host'
    if 'port' in key_lower:
        return 'port'
    if 'path' in key_lower or 'dir' in key_lower:
        return 'path'
    if value.lower() in ('true', 'false', '0', '1', 'yes', 'no'):
        return 'boolean'
    if value.isdigit():
        return 'number'
    return 'string'

def get_cmd_output(cmd):
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10, shell=isinstance(cmd, str))
        return result.stdout.strip() or result.stderr.strip()
    except:
        return 'N/A'

# ---------------------------------------------------------------
# .env ファイル収集 (候補パスを網羅)
# ---------------------------------------------------------------
CANDIDATE_PATHS = [
    # api/.env (主要)
    '/opt/tenmon-ark-repo/api/.env',
    '/opt/tenmon-ark-repo/api/.env.local',
    # ルート .env
    '/opt/tenmon-ark-repo/.env',
    '/opt/tenmon-ark-repo/.env.local',
    # server/.env
    '/opt/tenmon-ark-repo/server/.env',
    '/opt/tenmon-ark-repo/server/.env.local',
    # 旧パス (互換)
    '/opt/tenmon-ark/api/.env',
    '/opt/tenmon-ark/.env',
    # MC
    '/opt/tenmon-mc/mc.env',
    '/var/www/tenmon-mc/mc.env',
    # systemd / etc
    '/etc/tenmon/llm.env',
]

# systemd drop-in ディレクトリから .conf ファイルを自動検出
DROPIN_DIRS = glob.glob('/etc/systemd/system/tenmon-*.service.d/*.conf')
CANDIDATE_PATHS.extend(DROPIN_DIRS)

env_files = {}
for path in CANDIDATE_PATHS:
    if os.path.isfile(path):
        env_files[path] = mask_env_file(path)
    # 存在しないファイルはスキップ（エラーにしない）

# 発見されたファイル数のサマリ
env_summary = {
    'total_candidates': len(CANDIDATE_PATHS),
    'found': len([p for p in CANDIDATE_PATHS if os.path.isfile(p)]),
    'not_found': len([p for p in CANDIDATE_PATHS if not os.path.exists(p)]),
}

# ---------------------------------------------------------------
# ランタイム情報
# ---------------------------------------------------------------
runtime = {
    'os': get_cmd_output(['uname', '-a']),
    'os_release': get_cmd_output('cat /etc/os-release | head -5'),
    'node_version': get_cmd_output(['node', '--version']),
    'npm_version': get_cmd_output(['npm', '--version']),
    'pnpm_version': get_cmd_output(['pnpm', '--version']),
    'python_version': get_cmd_output(['python3', '--version']),
    'sqlite3_version': get_cmd_output(['sqlite3', '--version']),
    'nginx_version': get_cmd_output('nginx -v 2>&1'),
    'uptime': get_cmd_output(['uptime']),
    'memory': get_cmd_output(['free', '-h']),
    'cpu_info': get_cmd_output('nproc'),
}

# ---------------------------------------------------------------
# systemd EnvironmentFile 参照
# ---------------------------------------------------------------
systemd_env_refs = []
try:
    for root, dirs, files in os.walk('/etc/systemd/system'):
        for f in files:
            if f.endswith('.service') or f.endswith('.conf'):
                path = os.path.join(root, f)
                try:
                    with open(path) as fh:
                        content = fh.read()
                    for line in content.split('\n'):
                        stripped = line.strip()
                        if 'EnvironmentFile' in stripped:
                            systemd_env_refs.append({
                                'service': f,
                                'env_file_ref': stripped
                            })
                except:
                    pass
except:
    pass

# ---------------------------------------------------------------
# 出力
# ---------------------------------------------------------------
output = {
    'timestamp': get_cmd_output(['date', '-u', '+%Y-%m-%dT%H:%M:%SZ']),
    'env_files': env_files,
    'env_summary': env_summary,
    'runtime': runtime,
    'systemd_env_references': systemd_env_refs
}

output_dir = os.environ.get('OUTPUT_DIR', '/opt/tenmon-ark-repo/analysis/track_b/output')
with open(os.path.join(output_dir, 'env_audit.json'), 'w') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

found = env_summary['found']
total = env_summary['total_candidates']
print(f'[collect_env_audit] Done. Found {found}/{total} env files.', file=sys.stderr)
PYEOF

echo "[collect_env_audit] Output: $OUTPUT_DIR/env_audit.json" >&2
