#!/usr/bin/env bash
# ============================================================
# run_full_analysis.sh — TENMON_ARK_FULL_SYSTEM_ANALYSIS_V1
# Track B: VPS 解析オーケストレータ
# ============================================================
#
# 使い方:
#   export ANALYSIS_SALT=$(openssl rand -hex 32)
#   sudo bash analysis/track_b/scripts/run_full_analysis.sh
#
# 前提:
#   - VPS 上で root 権限で実行
#   - sqlite3, python3, curl, jq がインストール済み
#   - /opt/tenmon-ark-data/kokuzo.sqlite が存在
#
# 安全性:
#   - 全 SQL は SELECT のみ (INSERT/UPDATE/DELETE/DROP 禁止)
#   - systemctl は status/is-active のみ (restart/stop 禁止)
#   - ファイル書き込みは OUTPUT_DIR のみ
#   - 個人情報は全てマスク
#   - 中断しても再実行可能 (冪等)
#
# 所要時間: 10〜20 分
# ============================================================

set -euo pipefail

# --- 設定 ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
export OUTPUT_DIR="${OUTPUT_DIR:-${SCRIPT_DIR}/../output}"
export KOKUZO_DB="${KOKUZO_DB:-/opt/tenmon-ark-data/kokuzo.sqlite}"

# --- Salt 検証 ---
if [[ -z "${ANALYSIS_SALT:-}" ]]; then
  echo "============================================================"
  echo "ERROR: ANALYSIS_SALT is not set."
  echo ""
  echo "  export ANALYSIS_SALT=\$(openssl rand -hex 32)"
  echo "  sudo -E bash $0"
  echo ""
  echo "Salt は解析完了後に破棄してください。"
  echo "============================================================"
  exit 1
fi

# --- 出力ディレクトリ準備 ---
mkdir -p "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/hidden_feature_evidence"

# --- ヘッダー ---
echo "============================================================"
echo " TENMON_ARK_FULL_SYSTEM_ANALYSIS_V1 — Track B"
echo " VPS 解析オーケストレータ"
echo "============================================================"
echo " 開始時刻: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo " 出力先:   $OUTPUT_DIR"
echo " DB:       $KOKUZO_DB"
echo " Salt:     [SET, length=${#ANALYSIS_SALT}]"
echo "============================================================"
echo ""

# --- 依存チェック ---
echo "[Step 0] 依存チェック..."
MISSING=""
for cmd in sqlite3 python3 curl jq; do
  if ! command -v "$cmd" &>/dev/null; then
    MISSING="$MISSING $cmd"
  fi
done
if [[ -n "$MISSING" ]]; then
  echo "ERROR: Missing commands:$MISSING"
  echo "  sudo apt-get install -y sqlite3 python3 curl jq"
  exit 1
fi
echo "  全依存OK"
echo ""

# --- 実行関数 ---
run_step() {
  local step_num="$1"
  local step_name="$2"
  local script_path="$3"

  echo "============================================================"
  echo "[Step ${step_num}] ${step_name}"
  echo "============================================================"

  if [[ ! -f "$script_path" ]]; then
    echo "  ERROR: Script not found: $script_path"
    return 1
  fi

  local start_time
  start_time=$(date +%s)

  if bash "$script_path"; then
    local end_time
    end_time=$(date +%s)
    local elapsed=$((end_time - start_time))
    echo "  完了 (${elapsed}秒)"
  else
    echo "  WARNING: Step ${step_num} failed, continuing..."
  fi
  echo ""
}

# --- 実行 ---
run_step 1 "DB 解析" "${SCRIPT_DIR}/collect_db_inventory.sh"
run_step 2 "サービスマップ収集" "${SCRIPT_DIR}/collect_service_map.sh"
run_step 3 "環境監査" "${SCRIPT_DIR}/collect_env_audit.sh"
run_step 4 "Founder 利用パターン" "${SCRIPT_DIR}/collect_founder_usage.sh"
run_step 5 "隠れた機能の証拠収集" "${SCRIPT_DIR}/collect_hidden_feature_evidence.sh"

# --- 完了サマリー ---
echo "============================================================"
echo " 解析完了"
echo "============================================================"
echo " 終了時刻: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""
echo " 出力ファイル:"
find "$OUTPUT_DIR" -type f -name "*.json" | sort | while read -r f; do
  echo "   $(du -h "$f" | cut -f1)  $f"
done
echo ""
echo " 次のステップ:"
echo "   cd /opt/tenmon-ark-repo"
echo "   git add analysis/track_b/output/"
echo "   git commit -m 'feat(analysis): VPS 実データ収集完了'"
echo "   git push origin feature/full-system-analysis-track-b"
echo ""
echo " ※ ANALYSIS_SALT を破棄してください:"
echo "   unset ANALYSIS_SALT"
echo "============================================================"
