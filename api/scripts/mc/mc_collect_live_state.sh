#!/usr/bin/env bash
# api/scripts/mc/mc_collect_live_state.sh
# MC V2 FINAL — §9.2 Live State Collector

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/mc_lib.sh"

mc_info "Collecting live_state..."

OUTFILE="${MC_DATA_DIR}/live_state.json"

# ── Host info ────────────────────────────────────────────
HOSTNAME=$(hostname 2>/dev/null || echo "unknown")
PUBLIC_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo "unknown")
OS_INFO=$(lsb_release -ds 2>/dev/null || cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 | tr -d '"' || echo "unknown")

# ── Service status ───────────────────────────────────────
SVC_ACTIVE=$(systemctl is-active "${SERVICE_NAME}" 2>/dev/null || echo "unknown")
SVC_SUBSTATE=$(systemctl show "${SERVICE_NAME}" --property=SubState --value 2>/dev/null || echo "unknown")
SVC_PID=$(systemctl show "${SERVICE_NAME}" --property=MainPID --value 2>/dev/null || echo "0")
SVC_UPTIME_US=$(systemctl show "${SERVICE_NAME}" --property=ActiveEnterTimestampMonotonic --value 2>/dev/null || echo "0")
MONO_NOW=$(cat /proc/uptime 2>/dev/null | awk '{print int($1 * 1000000)}' || echo "0")
if [ "${SVC_UPTIME_US}" -gt 0 ] 2>/dev/null && [ "${MONO_NOW}" -gt 0 ] 2>/dev/null; then
  UPTIME_SEC=$(( (MONO_NOW - SVC_UPTIME_US) / 1000000 ))
else
  UPTIME_SEC="null"
fi

# ── Health check ─────────────────────────────────────────
HEALTH_START=$(date +%s%N)
HEALTH_RAW=$(curl -s --max-time 5 "${HEALTH_URL}" 2>/dev/null || echo '{"status":"unreachable"}')
HEALTH_END=$(date +%s%N)
HEALTH_MS=$(( (HEALTH_END - HEALTH_START) / 1000000 ))
HEALTH_OK=$(echo "${HEALTH_RAW}" | python3 -c "import json,sys; d=json.load(sys.stdin); print('true' if d.get('status')=='ok' else 'false')" 2>/dev/null || echo "false")
HEALTH_PREVIEW=$(echo "${HEALTH_RAW}" | head -c 200)

# ── Resources ────────────────────────────────────────────
DISK_JSON=$(df -BG --output=target,used,avail,pcent / /opt 2>/dev/null | tail -n +2 | awk '!seen[$1]++ {
  gsub(/G/,"",$2); gsub(/G/,"",$3); gsub(/%/,"",$4);
  printf "{\"path\":\"%s\",\"used_gb\":%s,\"free_gb\":%s,\"percent\":%s}\n", $1, $2, $3, $4
}' | paste -sd, | sed 's/^/[/;s/$/]/')
[ -z "${DISK_JSON}" ] || [ "${DISK_JSON}" = "[]" ] && DISK_JSON="[]"

MEM_TOTAL=$(free -g 2>/dev/null | awk '/Mem:/{print $2}' || echo "0")
MEM_AVAIL=$(free -g 2>/dev/null | awk '/Mem:/{print $7}' || echo "0")
SWAP=$(free -g 2>/dev/null | awk '/Swap:/{print $3}' || echo "0")
LOAD_AVG=$(cat /proc/loadavg 2>/dev/null | awk '{printf "[%s,%s,%s]", $1, $2, $3}' || echo "[0,0,0]")

# ── Timers ───────────────────────────────────────────────
TIMERS_JSON=$(systemctl list-timers --no-pager --output=json 2>/dev/null | python3 -c "
import json, sys
try:
    timers = json.load(sys.stdin)
    out = []
    for t in timers[:10]:
        out.append({
            'name': t.get('unit',''),
            'last': t.get('last',''),
            'next': t.get('next',''),
            'active': True
        })
    print(json.dumps(out))
except:
    print('[]')
" 2>/dev/null || echo "[]")

# ── Recent errors (last 1h) ─────────────────────────────
ERRORS_JSON=$(journalctl -u "${SERVICE_NAME}" --since "1 hour ago" -p err --no-pager -o json 2>/dev/null | python3 -c "
import json, sys
entries = []
for line in sys.stdin:
    try:
        d = json.loads(line)
        entries.append({
            'timestamp': d.get('__REALTIME_TIMESTAMP',''),
            'message_preview': d.get('MESSAGE','')[:200]
        })
    except: pass
print(json.dumps(entries[:20]))
" 2>/dev/null || echo "[]")

WARNINGS_JSON=$(journalctl -u "${SERVICE_NAME}" --since "1 hour ago" -p warning --no-pager -o json 2>/dev/null | python3 -c "
import json, sys
entries = []
for line in sys.stdin:
    try:
        d = json.loads(line)
        entries.append({
            'timestamp': d.get('__REALTIME_TIMESTAMP',''),
            'message_preview': d.get('MESSAGE','')[:200]
        })
    except: pass
print(json.dumps(entries[:20]))
" 2>/dev/null || echo "[]")

# ── Build JSON ───────────────────────────────────────────
cat <<EOF | mc_sanitize | mc_write_json "${OUTFILE}"
{
  "generated_at": "$(mc_now_iso)",
  "source_files": ["mc_collect_live_state.sh"],
  "stale": false,
  "host": {
    "hostname": "${HOSTNAME}",
    "public_ip": "${PUBLIC_IP}",
    "os": $(echo "${OS_INFO}" | json_escape)
  },
  "service": {
    "name": "${SERVICE_NAME}",
    "active": $([ "${SVC_ACTIVE}" = "active" ] && echo "true" || echo "false"),
    "substate": "${SVC_SUBSTATE}",
    "main_pid": ${SVC_PID:-0},
    "uptime_sec": ${UPTIME_SEC}
  },
  "health": {
    "ok": ${HEALTH_OK},
    "endpoint": "${HEALTH_URL}",
    "response_ms": ${HEALTH_MS},
    "raw_response_preview": $(echo "${HEALTH_PREVIEW}" | json_escape)
  },
  "resources": {
    "disk": ${DISK_JSON},
    "memory_total_gb": ${MEM_TOTAL},
    "memory_available_gb": ${MEM_AVAIL},
    "swap_gb": ${SWAP},
    "load_avg": ${LOAD_AVG}
  },
  "timers": ${TIMERS_JSON},
  "recent_errors": ${ERRORS_JSON},
  "recent_warnings": ${WARNINGS_JSON},
  "model_usage_1h": {},
  "soul_root_activity_1h": {},
  "llm_primary_failures_1h": 0
}
EOF

mc_info "live_state collection complete."
