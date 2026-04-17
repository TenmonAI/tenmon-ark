#!/usr/bin/env bash
# ============================================================
# collect_service_map.sh — サービスマップ収集スクリプト
# TENMON_ARK_FULL_SYSTEM_ANALYSIS_V1 / Track B
# ============================================================
# 収集対象:
#   - systemd サービス状態 (status/is-active/is-enabled/cat のみ)
#   - nginx 設定
#   - cron ジョブ
#   - journalctl エラー (直近7日)
#   - ディスク使用量
#   - ポートリスニング状態
# 安全性:
#   - restart/stop/start/reload/daemon-reload/disable/enable 全面禁止
#   - 全て READ-ONLY 操作のみ
# 出力: $OUTPUT_DIR/service_map.json
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_DIR="${OUTPUT_DIR:-${SCRIPT_DIR}/../output}"
mkdir -p "$OUTPUT_DIR"

echo "[collect_service_map] Starting service map collection..." >&2

# --- 1. systemd サービス ---
echo "[collect_service_map] Collecting systemd services..." >&2

SYSTEMD_FILE="$OUTPUT_DIR/systemd_inventory.json"

python3 << 'PYEOF'
import json, subprocess, sys, os

def get_service_info(svc_name):
    """systemctl status/is-active/is-enabled/show のみ使用（READ-ONLY）"""
    try:
        result = subprocess.run(['systemctl', 'is-active', svc_name],
                                capture_output=True, text=True, timeout=5)
        is_active = result.stdout.strip()
    except:
        is_active = 'unknown'
    try:
        result = subprocess.run(['systemctl', 'is-enabled', svc_name],
                                capture_output=True, text=True, timeout=5)
        is_enabled = result.stdout.strip()
    except:
        is_enabled = 'unknown'
    try:
        result = subprocess.run(
            ['systemctl', 'show', svc_name,
             '--property=MainPID,MemoryCurrent,ActiveEnterTimestamp,Description,'
             'FragmentPath,DropInPaths,Restart,RestartUSec'],
            capture_output=True, text=True, timeout=5)
        props = {}
        for line in result.stdout.strip().split('\n'):
            if '=' in line:
                k, _, v = line.partition('=')
                props[k] = v
    except:
        props = {}
    return {
        'name': svc_name,
        'is_active': is_active,
        'is_enabled': is_enabled,
        'main_pid': props.get('MainPID', ''),
        'memory_current': props.get('MemoryCurrent', ''),
        'active_since': props.get('ActiveEnterTimestamp', ''),
        'description': props.get('Description', ''),
        'fragment_path': props.get('FragmentPath', ''),
        'drop_in_paths': props.get('DropInPaths', ''),
        'restart_policy': props.get('Restart', ''),
    }

# systemd全サービス一覧 (--plain で装飾なし出力)
result = subprocess.run(
    ['systemctl', 'list-units', '--type=service', '--all', '--no-pager', '--plain'],
    capture_output=True, text=True, timeout=15
)
all_lines = result.stdout.strip().split('\n')

services = []
for line in all_lines:
    line = line.strip()
    if not line:
        continue
    # --plain 出力: UNIT LOAD ACTIVE SUB DESCRIPTION...
    # 失敗マーカー ● を除去してから分割
    line = line.lstrip('\u25cf').lstrip('●').strip()
    parts = line.split(None, 4)  # maxsplit=4: 最大5要素
    if len(parts) < 4:
        continue  # 不完全な行はスキップ
    unit_name = parts[0]
    if not unit_name.endswith('.service'):
        continue
    info = get_service_info(unit_name)
    # --plain 出力の列情報も追加
    info['load_state'] = parts[1] if len(parts) > 1 else 'unknown'
    info['active_state'] = parts[2] if len(parts) > 2 else 'unknown'
    info['sub_state'] = parts[3] if len(parts) > 3 else 'unknown'
    services.append(info)

# tenmon-* を優先表示するが、全サービスも収集
tenmon_related = [s for s in services
                  if any(k in s['name'].lower() for k in ['tenmon', 'ark', 'mc'])]
running = [s for s in services if s['is_active'] == 'active']
failed = [s for s in services if s['active_state'] == 'failed' or s['is_active'] == 'failed']

output = {
    'tenmon_related': tenmon_related,
    'failed_services': failed,
    'running_services': [{'name': s['name'], 'description': s['description']} for s in running],
    'all_services_count': len(services),
    'total_running': len(running),
    'total_failed': len(failed),
}

output_dir = os.environ.get('OUTPUT_DIR', '/opt/tenmon-ark-repo/analysis/track_b/output')
systemd_file = os.path.join(output_dir, 'systemd_inventory.json')
with open(systemd_file, 'w') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f'[collect_service_map] Found {len(tenmon_related)} tenmon-related, '
      f'{len(running)} running, {len(failed)} failed services', file=sys.stderr)
PYEOF

# --- 2. nginx 設定 ---
echo "[collect_service_map] Collecting nginx config..." >&2

NGINX_FILE="$OUTPUT_DIR/nginx_config.json"
python3 << 'PYEOF'
import json, subprocess, os, glob

configs = []
# sites-enabled
for f in sorted(glob.glob('/etc/nginx/sites-enabled/*')):
    try:
        with open(f) as fh:
            content = fh.read()
        configs.append({'path': f, 'content': content[:2000], 'size': len(content)})
    except:
        configs.append({'path': f, 'error': 'permission denied'})

# conf.d
for f in sorted(glob.glob('/etc/nginx/conf.d/*.conf')):
    try:
        with open(f) as fh:
            content = fh.read()
        configs.append({'path': f, 'content': content[:2000], 'size': len(content)})
    except:
        configs.append({'path': f, 'error': 'permission denied'})

# nginx -T (テスト出力)
try:
    result = subprocess.run(['nginx', '-T'], capture_output=True, text=True, timeout=10)
    test_output = result.stdout[:5000] if result.returncode == 0 else result.stderr[:2000]
except:
    test_output = 'nginx command not available'

output = {
    'config_files': configs,
    'total_configs': len(configs),
    'nginx_test': test_output[:3000]
}

output_dir = os.environ.get('OUTPUT_DIR', '/opt/tenmon-ark-repo/analysis/track_b/output')
with open(os.path.join(output_dir, 'nginx_config.json'), 'w') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)
PYEOF

# --- 3. cron ジョブ ---
echo "[collect_service_map] Collecting cron jobs..." >&2

CRON_FILE="$OUTPUT_DIR/cron_inventory.json"
python3 << 'PYEOF'
import json, subprocess, os, glob

crons = []

# /etc/cron.d/
for f in sorted(glob.glob('/etc/cron.d/*')):
    try:
        with open(f) as fh:
            content = fh.read()
        crons.append({'source': f, 'content': content.strip()})
    except:
        crons.append({'source': f, 'error': 'permission denied'})

# crontab -l for root and www-data
for user in ['root', 'www-data', 'ubuntu']:
    try:
        result = subprocess.run(['crontab', '-l', '-u', user],
                                capture_output=True, text=True, timeout=5)
        if result.returncode == 0 and result.stdout.strip():
            crons.append({'source': f'crontab -u {user}', 'content': result.stdout.strip()})
    except:
        pass

# systemd timers
try:
    result = subprocess.run(['systemctl', 'list-timers', '--all', '--no-pager'],
                            capture_output=True, text=True, timeout=10)
    timers = result.stdout.strip()
except:
    timers = 'systemctl not available'

output = {
    'cron_entries': crons,
    'systemd_timers': timers,
    'total_cron_entries': len(crons)
}

output_dir = os.environ.get('OUTPUT_DIR', '/opt/tenmon-ark-repo/analysis/track_b/output')
with open(os.path.join(output_dir, 'cron_inventory.json'), 'w') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)
PYEOF

# --- 4. journalctl エラー (直近7日) ---
echo "[collect_service_map] Collecting journalctl errors (7 days)..." >&2

JOURNAL_FILE="$OUTPUT_DIR/journalctl_errors.json"
python3 << 'PYEOF'
import json, subprocess, os

errors = {}

# tenmon関連サービスのエラー
for svc in ['tenmon-ark-api', 'tenmon-ark', 'nginx']:
    try:
        result = subprocess.run(
            ['journalctl', '-u', svc, '--since', '7 days ago',
             '-p', 'err', '--no-pager', '-o', 'short-iso'],
            capture_output=True, text=True, timeout=30
        )
        lines = result.stdout.strip().split('\n') if result.stdout.strip() else []
        errors[svc] = {
            'total_error_lines': len(lines),
            'recent_errors': lines[-50:] if lines else []
        }
    except Exception as e:
        errors[svc] = {'error': str(e)}

# 全体のcritical/emergency
try:
    result = subprocess.run(
        ['journalctl', '--since', '7 days ago', '-p', 'crit',
         '--no-pager', '-o', 'short-iso'],
        capture_output=True, text=True, timeout=30
    )
    lines = result.stdout.strip().split('\n') if result.stdout.strip() else []
    errors['system_critical'] = {
        'total_lines': len(lines),
        'recent': lines[-20:] if lines else []
    }
except Exception as e:
    errors['system_critical'] = {'error': str(e)}

output_dir = os.environ.get('OUTPUT_DIR', '/opt/tenmon-ark-repo/analysis/track_b/output')
with open(os.path.join(output_dir, 'journalctl_errors.json'), 'w') as f:
    json.dump(errors, f, indent=2, ensure_ascii=False)
PYEOF

# --- 5. ディスク使用量 ---
echo "[collect_service_map] Collecting disk usage..." >&2

DISK_FILE="$OUTPUT_DIR/disk_usage.json"
python3 << 'PYEOF'
import json, subprocess, os

# df
result = subprocess.run(['df', '-h'], capture_output=True, text=True, timeout=10)
df_output = result.stdout.strip()

# du for key directories
dirs_to_check = [
    '/opt/tenmon-ark',
    '/opt/tenmon-ark-data',
    '/opt/tenmon-ark-repo',
    '/opt/tenmon-mc',
    '/var/www/tenmon-mc',
    '/var/log',
    '/tmp'
]

du_results = {}
for d in dirs_to_check:
    try:
        result = subprocess.run(['du', '-sh', d], capture_output=True, text=True, timeout=10)
        du_results[d] = result.stdout.strip().split('\t')[0] if result.returncode == 0 else 'N/A'
    except:
        du_results[d] = 'error'

output = {
    'df': df_output,
    'directory_sizes': du_results
}

output_dir = os.environ.get('OUTPUT_DIR', '/opt/tenmon-ark-repo/analysis/track_b/output')
with open(os.path.join(output_dir, 'disk_usage.json'), 'w') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)
PYEOF

# --- 6. ポートリスニング ---
echo "[collect_service_map] Collecting listening ports..." >&2

PORTS_FILE="$OUTPUT_DIR/listening_ports.json"
python3 << 'PYEOF'
import json, subprocess, os

result = subprocess.run(['ss', '-tlnp'], capture_output=True, text=True, timeout=10)
lines = result.stdout.strip().split('\n')

ports = []
for line in lines[1:]:  # skip header
    parts = line.split()
    if len(parts) >= 4:
        port_entry = {
            'state': parts[0] if len(parts) > 0 else '',
            'recv_q': parts[1] if len(parts) > 1 else '',
            'send_q': parts[2] if len(parts) > 2 else '',
            'local_address': parts[3] if len(parts) > 3 else '',
        }
        if len(parts) > 4:
            port_entry['peer_address'] = parts[4]
        if len(parts) > 5:
            port_entry['process'] = parts[5]
        ports.append(port_entry)

output_dir = os.environ.get('OUTPUT_DIR', '/opt/tenmon-ark-repo/analysis/track_b/output')
with open(os.path.join(output_dir, 'listening_ports.json'), 'w') as f:
    json.dump({'listening_ports': ports, 'total': len(ports)}, f, indent=2, ensure_ascii=False)
PYEOF

# --- 統合結果 ---
echo "[collect_service_map] Merging results..." >&2

python3 << 'PYEOF'
import json, os, datetime

output_dir = os.environ.get('OUTPUT_DIR', '/opt/tenmon-ark-repo/analysis/track_b/output')
combined = {'timestamp': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')}

files = {
    'systemd': os.path.join(output_dir, 'systemd_inventory.json'),
    'nginx': os.path.join(output_dir, 'nginx_config.json'),
    'cron': os.path.join(output_dir, 'cron_inventory.json'),
    'journalctl_errors': os.path.join(output_dir, 'journalctl_errors.json'),
    'disk_usage': os.path.join(output_dir, 'disk_usage.json'),
    'listening_ports': os.path.join(output_dir, 'listening_ports.json'),
}

for key, path in files.items():
    try:
        with open(path) as f:
            combined[key] = json.load(f)
    except:
        combined[key] = {'error': f'Failed to load {path}'}

with open(os.path.join(output_dir, 'service_map.json'), 'w') as f:
    json.dump(combined, f, indent=2, ensure_ascii=False)
PYEOF

echo "[collect_service_map] Done. Output: $OUTPUT_DIR/service_map.json" >&2
