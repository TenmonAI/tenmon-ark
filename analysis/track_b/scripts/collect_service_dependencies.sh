#!/usr/bin/env bash
# ============================================================
# collect_service_dependencies.sh — サービス依存関係グラフ抽出
# TENMON_ARK_FULL_SYSTEM_ANALYSIS_V1 / Track B / Part B.3
# ============================================================
# 目的: tenmon-* サービス間の依存関係グラフを抽出
# 安全性:
#   - systemctl は status/is-active/is-enabled/cat/show のみ
#   - restart/stop/start/reload/daemon-reload/disable/enable 全面禁止
# 出力: $OUTPUT_DIR/service_dependencies.json
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_DIR="${OUTPUT_DIR:-${SCRIPT_DIR}/../output}"
mkdir -p "$OUTPUT_DIR"

echo "[collect_service_dependencies] Starting service dependency analysis..." >&2

python3 << 'PYEOF'
import json, subprocess, os, sys, glob, re

OUTPUT_DIR = os.environ.get('OUTPUT_DIR', '/opt/tenmon-ark-repo/analysis/track_b/output')

def get_cmd(cmd, timeout=10):
    """コマンド実行 (READ-ONLY)"""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout,
                                shell=isinstance(cmd, str))
        return result.stdout.strip()
    except:
        return ''

def parse_service_file(path):
    """systemd サービスファイルをパースして依存関係を抽出"""
    result = {
        'after': [],
        'requires': [],
        'wants': [],
        'part_of': [],
        'binds_to': [],
        'exec_start': '',
        'exec_start_pre': [],
        'environment_files': [],
        'environment': [],
        'working_directory': '',
        'user': '',
        'restart': '',
        'restart_sec': '',
        'type': '',
    }
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line.startswith('#') or not line:
                    continue
                if '=' not in line:
                    continue
                key, _, value = line.partition('=')
                key = key.strip()
                value = value.strip()
                if key == 'After':
                    result['after'].extend(value.split())
                elif key == 'Requires':
                    result['requires'].extend(value.split())
                elif key == 'Wants':
                    result['wants'].extend(value.split())
                elif key == 'PartOf':
                    result['part_of'].extend(value.split())
                elif key == 'BindsTo':
                    result['binds_to'].extend(value.split())
                elif key == 'ExecStart':
                    result['exec_start'] = value
                elif key == 'ExecStartPre':
                    result['exec_start_pre'].append(value)
                elif key == 'EnvironmentFile':
                    result['environment_files'].append(value.lstrip('-'))
                elif key == 'Environment':
                    # 変数名のみ記録（値は秘匿）
                    env_val = value.strip('"').strip("'")
                    if '=' in env_val:
                        env_key = env_val.split('=', 1)[0]
                        result['environment'].append(env_key)
                elif key == 'WorkingDirectory':
                    result['working_directory'] = value
                elif key == 'User':
                    result['user'] = value
                elif key == 'Restart':
                    result['restart'] = value
                elif key == 'RestartSec':
                    result['restart_sec'] = value
                elif key == 'Type':
                    result['type'] = value
    except Exception as e:
        result['parse_error'] = str(e)
    return result

def get_service_state(svc_name):
    """サービスの現在の状態"""
    return get_cmd(['systemctl', 'is-active', svc_name]) or 'unknown'

def get_fail_count_7d(svc_name):
    """直近7日の失敗回数"""
    try:
        output = get_cmd(
            f'journalctl -u {svc_name} --since "7 days ago" --no-pager -o cat 2>/dev/null | '
            f'grep -c -E "Failed|failed|ERROR|error|exit-code" || true')
        return int(output) if output.isdigit() else 0
    except:
        return 0

# ---------------------------------------------------------------
# tenmon-* サービスファイルを収集
# ---------------------------------------------------------------
service_files = []
# /etc/systemd/system/ 直下
service_files.extend(glob.glob('/etc/systemd/system/tenmon-*.service'))
# /lib/systemd/system/ (パッケージインストール分)
service_files.extend(glob.glob('/lib/systemd/system/tenmon-*.service'))
# 重複除去
service_files = sorted(set(service_files))

# 全 systemd サービス一覧も取得（tenmon以外も参考用）
all_services_output = get_cmd(
    ['systemctl', 'list-units', '--type=service', '--all', '--no-pager', '--plain'])

services = []
for svc_path in service_files:
    svc_name = os.path.basename(svc_path)
    print(f'  Analyzing: {svc_name}', file=sys.stderr)

    parsed = parse_service_file(svc_path)

    # Drop-in ディレクトリ
    dropin_dir = svc_path + '.d'
    drop_ins = []
    if os.path.isdir(dropin_dir):
        for conf in sorted(glob.glob(os.path.join(dropin_dir, '*.conf'))):
            drop_ins.append(conf)
            # drop-in の内容もパース
            dropin_parsed = parse_service_file(conf)
            # マージ
            for key in ['after', 'requires', 'wants', 'part_of', 'binds_to',
                        'exec_start_pre', 'environment_files', 'environment']:
                if dropin_parsed.get(key):
                    parsed[key].extend(dropin_parsed[key])
            # 上書き系
            for key in ['exec_start', 'working_directory', 'user', 'restart',
                        'restart_sec', 'type']:
                if dropin_parsed.get(key):
                    parsed[key] = dropin_parsed[key]

    service_entry = {
        'name': svc_name.replace('.service', ''),
        'file_path': svc_path,
        'state': get_service_state(svc_name),
        'after': parsed['after'],
        'requires': parsed['requires'],
        'wants': parsed['wants'],
        'part_of': parsed['part_of'],
        'binds_to': parsed['binds_to'],
        'drop_ins': drop_ins,
        'exec_start': parsed['exec_start'],
        'environment_files': parsed['environment_files'],
        'environment_vars': parsed['environment'],  # 変数名のみ
        'working_directory': parsed['working_directory'],
        'user': parsed['user'],
        'restart_policy': parsed['restart'],
        'restart_sec': parsed['restart_sec'],
        'service_type': parsed['type'],
        'last_fail_count_7d': get_fail_count_7d(svc_name),
    }
    services.append(service_entry)

# ---------------------------------------------------------------
# 依存関係グラフ (Mermaid 可視化用)
# ---------------------------------------------------------------
nodes = set()
edges = []

for svc in services:
    svc_id = svc['name']
    nodes.add(svc_id)

    for dep in svc['after']:
        dep_clean = dep.replace('.service', '').replace('.target', '')
        nodes.add(dep_clean)
        edges.append({
            'from': dep_clean,
            'to': svc_id,
            'type': 'after',
            'label': 'After'
        })

    for dep in svc['requires']:
        dep_clean = dep.replace('.service', '').replace('.target', '')
        nodes.add(dep_clean)
        edges.append({
            'from': svc_id,
            'to': dep_clean,
            'type': 'requires',
            'label': 'Requires'
        })

    for dep in svc['wants']:
        dep_clean = dep.replace('.service', '').replace('.target', '')
        nodes.add(dep_clean)
        edges.append({
            'from': svc_id,
            'to': dep_clean,
            'type': 'wants',
            'label': 'Wants'
        })

    for dep in svc['binds_to']:
        dep_clean = dep.replace('.service', '').replace('.target', '')
        nodes.add(dep_clean)
        edges.append({
            'from': svc_id,
            'to': dep_clean,
            'type': 'binds_to',
            'label': 'BindsTo'
        })

# Mermaid グラフ生成
mermaid_lines = ['graph TD']
for node in sorted(nodes):
    safe_id = re.sub(r'[^a-zA-Z0-9_]', '_', node)
    mermaid_lines.append(f'    {safe_id}["{node}"]')
for edge in edges:
    from_id = re.sub(r'[^a-zA-Z0-9_]', '_', edge['from'])
    to_id = re.sub(r'[^a-zA-Z0-9_]', '_', edge['to'])
    mermaid_lines.append(f'    {from_id} -->|{edge["label"]}| {to_id}')

# ---------------------------------------------------------------
# 出力
# ---------------------------------------------------------------
output = {
    'timestamp': get_cmd(['date', '-u', '+%Y-%m-%dT%H:%M:%SZ']),
    'total_tenmon_services': len(services),
    'services': services,
    'dependency_graph': {
        'nodes': sorted(list(nodes)),
        'edges': edges,
        'mermaid': '\n'.join(mermaid_lines),
    },
}

with open(os.path.join(OUTPUT_DIR, 'service_dependencies.json'), 'w') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f'[collect_service_dependencies] Done. {len(services)} services, '
      f'{len(nodes)} nodes, {len(edges)} edges.', file=sys.stderr)
PYEOF

echo "[collect_service_dependencies] Output: $OUTPUT_DIR/service_dependencies.json" >&2
