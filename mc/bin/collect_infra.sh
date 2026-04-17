#!/bin/bash
# ============================================================
# TENMON-MC §1: インフラ状態収集
# 出力: JSON (stdout)
# ============================================================
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/common.sh"

SYSTEMD_STATE=$(systemctl is-active "$SERVICE_NAME" 2>/dev/null || echo "unknown")
API_HEALTH=$(timeout 5 curl -s -o /dev/null -w "%{http_code}" "${API_URL}/api/health" 2>/dev/null || echo "timeout")

CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'.' -f1 || echo "0")
MEM_USED=$(free -m | awk 'NR==2{printf "%d", $3}' || echo "0")
MEM_TOTAL=$(free -m | awk 'NR==2{printf "%d", $2}' || echo "0")
DISK_USED=$(df -h / | awk 'NR==2{print $5}' | tr -d '%' || echo "0")

# 直近24時間のAPI エラー数
ERR_COUNT_24H=$(journalctl -u "$SERVICE_NAME" --since "24 hours ago" --no-pager 2>/dev/null | grep -icE "error|fatal|crash" || true)

# Node.js プロセスのCPU/MEM
# awk で1つだけ表示して抜ける（printf "\n" + exit で即終了）
PROC_INFO=$(ps aux | grep -E "node.*dist" | grep -v grep | awk '{printf "cpu=%.1f%%,mem=%.1f%%\n", $3, $4; exit}')
PROC_INFO="${PROC_INFO:-none}"

# uptime
UPTIME_STR=$(uptime -p 2>/dev/null || echo "unknown")

cat <<JSON
{
  "section": "infra",
  "systemd_state": "$(json_string_safe "$SYSTEMD_STATE")",
  "api_health_http_code": "$(json_string_safe "$API_HEALTH")",
  "cpu_pct": "$(ensure_num "$CPU_USAGE")",
  "mem_used_mb": $(ensure_num "$MEM_USED"),
  "mem_total_mb": $(ensure_num "$MEM_TOTAL"),
  "disk_pct": "$(ensure_num "$DISK_USED")",
  "error_count_24h": $(ensure_num "$ERR_COUNT_24H"),
  "process_info": "$(json_string_safe "$PROC_INFO")",
  "uptime": "$(json_string_safe "$UPTIME_STR")"
}
JSON
