#!/usr/bin/env bash
# ============================================================
# collect_env_audit.sh — 環境変数監査スクリプト
# TENMON_ARK_FULL_SYSTEM_ANALYSIS_V1 / Track B
# ============================================================
# 収集対象:
#   - .env ファイルの変数名と値の長さ（値自体は含めない）
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
import json, subprocess, os, re, sys

def mask_env_file(filepath):
    """envファイルの変数名と値の長さのみ記録"""
    result = []
    try:
        with open(filepath) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    key, _, value = line.partition('=')
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    result.append({
                        'name': key,
                        'is_set': bool(value),
                        'length': len(value),
                        'looks_like': classify_value(key, value)
                    })
    except FileNotFoundError:
        return {'error': f'File not found: {filepath}'}
    except PermissionError:
        return {'error': f'Permission denied: {filepath}'}
    return result

def classify_value(key, value):
    """値の種類を推定（値自体は含めない）"""
    key_lower = key.lower()
    if 'token' in key_lower or 'key' in key_lower or 'secret' in key_lower:
        return 'secret/token'
    if 'url' in key_lower or 'host' in key_lower:
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
        return result.stdout.strip()
    except:
        return 'N/A'

# --- .env ファイル収集 ---
env_files = {}
env_paths = [
    '/opt/tenmon-ark/api/.env',
    '/opt/tenmon-ark/tenmon-ark/.env',
    '/opt/tenmon-ark/.env',
    '/opt/tenmon-mc/mc.env',
]

for path in env_paths:
    env_files[path] = mask_env_file(path)

# --- ランタイム情報 ---
runtime = {
    'os': get_cmd_output(['uname', '-a']),
    'os_release': get_cmd_output('cat /etc/os-release | head -5'),
    'node_version': get_cmd_output(['node', '--version']),
    'npm_version': get_cmd_output(['npm', '--version']),
    'pnpm_version': get_cmd_output(['pnpm', '--version']),
    'python_version': get_cmd_output(['python3', '--version']),
    'sqlite3_version': get_cmd_output(['sqlite3', '--version']),
    'nginx_version': get_cmd_output(['nginx', '-v']),
    'uptime': get_cmd_output(['uptime']),
    'memory': get_cmd_output(['free', '-h']),
    'cpu_info': get_cmd_output('nproc'),
}

# --- systemd EnvironmentFile 参照 ---
systemd_env_refs = []
try:
    for root, dirs, files in os.walk('/etc/systemd/system'):
        for f in files:
            if f.endswith('.service'):
                path = os.path.join(root, f)
                try:
                    with open(path) as fh:
                        content = fh.read()
                    for line in content.split('\n'):
                        if 'EnvironmentFile' in line:
                            systemd_env_refs.append({
                                'service': f,
                                'env_file_ref': line.strip()
                            })
                except:
                    pass
except:
    pass

# --- 出力 ---
output = {
    'timestamp': get_cmd_output(['date', '-u', '+%Y-%m-%dT%H:%M:%SZ']),
    'env_files': env_files,
    'runtime': runtime,
    'systemd_env_references': systemd_env_refs
}

output_dir = os.environ.get('OUTPUT_DIR', '/opt/tenmon-ark-repo/analysis/track_b/output')
with open(os.path.join(output_dir, 'env_audit.json'), 'w') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print('[collect_env_audit] Done.', file=sys.stderr)
PYEOF

echo "[collect_env_audit] Output: $OUTPUT_DIR/env_audit.json" >&2
