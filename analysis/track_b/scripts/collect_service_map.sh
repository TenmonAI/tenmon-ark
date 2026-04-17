#!/usr/bin/env bash
# ============================================================
# collect_service_map.sh — サービスマップ収集スクリプト
# TENMON_ARK_FULL_SYSTEM_ANALYSIS_V1 / Track B
# ============================================================
# 収集対象:
#   - systemd サービス状態 (status のみ、restart/stop 禁止)
#   - nginx 設定
#   - cron ジョブ
#   - journalctl エラー (直近7日)
#   - ディスク使用量
#   - ポートリスニング状態
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

# tenmon関連サービスの状態を取得
TENMON_SERVICES=$(systemctl list-units --type=service --all --no-pager 2>/dev/null | grep -i "tenmon\|ark\|mc" | awk '{print $1}' || echo "")
ALL_CUSTOM_SERVICES=$(systemctl list-units --type=service --state=running --no-pager 2>/dev/null | grep -vE "^(systemd-|dbus|ssh|cron|rsyslog|ufw|snap|unattended|polkit|accounts|network|user@)" | awk '{print $1}' | grep ".service" || echo "")

python3 << 'PYEOF'
import json, subprocess, sys

def get_service_info(svc_name):
    """systemctl status のみ使用（READ-ONLY）"""
    try:
        result = subprocess.run(
            ["systemctl", "is-active", svc_name],
            capture_output=True, text=True, timeout=5
        )
        is_active = result.stdout.strip()
    except:
        is_active = "unknown"

    try:
        result = subprocess.run(
            ["systemctl", "is-enabled", svc_name],
            capture_output=True, text=True, timeout=5
        )
        is_enabled = result.stdout.strip()
    except:
        is_enabled = "unknown"

    try:
        result = subprocess.run(
            ["systemctl", "show", svc_name, "--property=MainPID,MemoryAccounting,MemoryCurrent,ActiveEnterTimestamp,Description"],
            capture_output=True, text=True, timeout=5
        )
        props = {}
        for line in result.stdout.strip().split("\n"):
            if "=" in line:
                k, v = line.split("=", 1)
                props[k] = v
    except:
        props = {}

    return {
        "name": svc_name,
        "is_active": is_active,
        "is_enabled": is_enabled,
        "main_pid": props.get("MainPID", ""),
        "memory_current": props.get("MemoryCurrent", ""),
        "active_since": props.get("ActiveEnterTimestamp", ""),
        "description": props.get("Description", "")
    }

# tenmon関連
tenmon_svcs = [s.strip() for s in """TENMON_SERVICES""".strip().split("\n") if s.strip()]
all_running = [s.strip() for s in """ALL_CUSTOM_SERVICES""".strip().split("\n") if s.strip()]

# 重複除去
all_svcs = list(set(tenmon_svcs + all_running))
all_svcs.sort()

services = [get_service_info(s) for s in all_svcs if s]

result = {
    "tenmon_related": [s for s in services if any(k in s["name"].lower() for k in ["tenmon", "ark", "mc"])],
    "other_running": [s for s in services if not any(k in s["name"].lower() for k in ["tenmon", "ark", "mc"])],
    "total_services": len(services)
}

with open(sys.argv[1], "w") as f:
    json.dump(result, f, indent=2, ensure_ascii=False)
PYEOF

# テンプレート変数を置換して実行
python3 -c "
import json, subprocess, sys

def get_service_info(svc_name):
    try:
        result = subprocess.run(['systemctl', 'is-active', svc_name], capture_output=True, text=True, timeout=5)
        is_active = result.stdout.strip()
    except:
        is_active = 'unknown'
    try:
        result = subprocess.run(['systemctl', 'is-enabled', svc_name], capture_output=True, text=True, timeout=5)
        is_enabled = result.stdout.strip()
    except:
        is_enabled = 'unknown'
    try:
        result = subprocess.run(['systemctl', 'show', svc_name, '--property=MainPID,MemoryCurrent,ActiveEnterTimestamp,Description'], capture_output=True, text=True, timeout=5)
        props = {}
        for line in result.stdout.strip().split('\n'):
            if '=' in line:
                k, v = line.split('=', 1)
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
        'description': props.get('Description', '')
    }

# systemd全サービス一覧
result = subprocess.run(['systemctl', 'list-units', '--type=service', '--all', '--no-pager', '--plain'], capture_output=True, text=True, timeout=10)
all_lines = result.stdout.strip().split('\n')
services = []
for line in all_lines:
    parts = line.split()
    if parts and parts[0].endswith('.service'):
        svc = parts[0]
        info = get_service_info(svc)
        services.append(info)

tenmon_related = [s for s in services if any(k in s['name'].lower() for k in ['tenmon', 'ark', 'mc'])]
running = [s for s in services if s['is_active'] == 'active']

output = {
    'tenmon_related': tenmon_related,
    'running_services': [{'name': s['name'], 'description': s['description']} for s in running],
    'total_services': len(services),
    'total_running': len(running)
}

with open('$SYSTEMD_FILE', 'w') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)
print(f'[collect_service_map] Found {len(tenmon_related)} tenmon-related, {len(running)} running services', file=sys.stderr)
"

# --- 2. nginx 設定 ---
echo "[collect_service_map] Collecting nginx config..." >&2

NGINX_FILE="$OUTPUT_DIR/nginx_config.json"
python3 -c "
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

with open('$NGINX_FILE', 'w') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)
"

# --- 3. cron ジョブ ---
echo "[collect_service_map] Collecting cron jobs..." >&2

CRON_FILE="$OUTPUT_DIR/cron_inventory.json"
python3 -c "
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
        result = subprocess.run(['crontab', '-l', '-u', user], capture_output=True, text=True, timeout=5)
        if result.returncode == 0 and result.stdout.strip():
            crons.append({'source': f'crontab -u {user}', 'content': result.stdout.strip()})
    except:
        pass

# systemd timers
try:
    result = subprocess.run(['systemctl', 'list-timers', '--all', '--no-pager'], capture_output=True, text=True, timeout=10)
    timers = result.stdout.strip()
except:
    timers = 'systemctl not available'

output = {
    'cron_entries': crons,
    'systemd_timers': timers,
    'total_cron_entries': len(crons)
}

with open('$CRON_FILE', 'w') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)
"

# --- 4. journalctl エラー (直近7日) ---
echo "[collect_service_map] Collecting journalctl errors (7 days)..." >&2

JOURNAL_FILE="$OUTPUT_DIR/journalctl_errors.json"
python3 -c "
import json, subprocess

errors = {}

# tenmon関連サービスのエラー
for svc in ['tenmon-ark-api', 'tenmon-ark', 'nginx']:
    try:
        result = subprocess.run(
            ['journalctl', '-u', svc, '--since', '7 days ago', '-p', 'err', '--no-pager', '-o', 'short-iso'],
            capture_output=True, text=True, timeout=30
        )
        lines = result.stdout.strip().split('\n') if result.stdout.strip() else []
        # 最新50行のみ
        errors[svc] = {
            'total_error_lines': len(lines),
            'recent_errors': lines[-50:] if lines else []
        }
    except Exception as e:
        errors[svc] = {'error': str(e)}

# 全体のcritical/emergency
try:
    result = subprocess.run(
        ['journalctl', '--since', '7 days ago', '-p', 'crit', '--no-pager', '-o', 'short-iso'],
        capture_output=True, text=True, timeout=30
    )
    lines = result.stdout.strip().split('\n') if result.stdout.strip() else []
    errors['system_critical'] = {
        'total_lines': len(lines),
        'recent': lines[-20:] if lines else []
    }
except Exception as e:
    errors['system_critical'] = {'error': str(e)}

with open('$JOURNAL_FILE', 'w') as f:
    json.dump(errors, f, indent=2, ensure_ascii=False)
"

# --- 5. ディスク使用量 ---
echo "[collect_service_map] Collecting disk usage..." >&2

DISK_FILE="$OUTPUT_DIR/disk_usage.json"
python3 -c "
import json, subprocess

# df
result = subprocess.run(['df', '-h'], capture_output=True, text=True, timeout=10)
df_output = result.stdout.strip()

# du for key directories
dirs_to_check = [
    '/opt/tenmon-ark',
    '/opt/tenmon-ark-data',
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

with open('$DISK_FILE', 'w') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)
"

# --- 6. ポートリスニング ---
echo "[collect_service_map] Collecting listening ports..." >&2

PORTS_FILE="$OUTPUT_DIR/listening_ports.json"
python3 -c "
import json, subprocess

result = subprocess.run(['ss', '-tlnp'], capture_output=True, text=True, timeout=10)
lines = result.stdout.strip().split('\n')

ports = []
for line in lines[1:]:  # skip header
    parts = line.split()
    if len(parts) >= 5:
        ports.append({
            'state': parts[0],
            'recv_q': parts[1],
            'send_q': parts[2],
            'local_address': parts[3],
            'peer_address': parts[4],
            'process': parts[5] if len(parts) > 5 else ''
        })

with open('$PORTS_FILE', 'w') as f:
    json.dump({'listening_ports': ports, 'total': len(ports)}, f, indent=2, ensure_ascii=False)
"

# --- 統合結果 ---
echo "[collect_service_map] Merging results..." >&2

python3 -c "
import json, glob

combined = {'timestamp': '$(date -u +%Y-%m-%dT%H:%M:%SZ)'}
files = {
    'systemd': '$SYSTEMD_FILE',
    'nginx': '$NGINX_FILE',
    'cron': '$CRON_FILE',
    'journalctl_errors': '$JOURNAL_FILE',
    'disk_usage': '$DISK_FILE',
    'listening_ports': '$PORTS_FILE'
}

for key, path in files.items():
    try:
        with open(path) as f:
            combined[key] = json.load(f)
    except:
        combined[key] = {'error': f'Failed to load {path}'}

with open('$OUTPUT_DIR/service_map.json', 'w') as f:
    json.dump(combined, f, indent=2, ensure_ascii=False)
"

echo "[collect_service_map] Done. Output: $OUTPUT_DIR/service_map.json" >&2
