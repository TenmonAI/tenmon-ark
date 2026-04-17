#!/usr/bin/env bash
# ============================================================
# run_full_analysis.sh — TENMON_ARK_FULL_SYSTEM_ANALYSIS_V1
# Track B: VPS 解析オーケストレータ v2
# ============================================================
#
# 使い方:
#   # 全ステップ実行 (デフォルト):
#   export ANALYSIS_SALT=$(openssl rand -hex 32)
#   sudo -E bash analysis/track_b/scripts/run_full_analysis.sh
#
#   # 特定ステップのみ実行:
#   sudo -E bash analysis/track_b/scripts/run_full_analysis.sh --step 2,3
#   sudo -E bash analysis/track_b/scripts/run_full_analysis.sh --step 6,7,8
#
#   # 前回失敗したステップのみ再実行:
#   sudo -E bash analysis/track_b/scripts/run_full_analysis.sh --retry-failed
#
# 前提:
#   - VPS 上で root 権限で実行
#   - sqlite3, python3, curl, jq がインストール済み
#   - /opt/tenmon-ark-data/kokuzo.sqlite が存在
#
# 安全性:
#   - 全 SQL は SELECT のみ (INSERT/UPDATE/DELETE/DROP 禁止)
#   - systemctl は status/is-active/is-enabled/cat/show のみ
#     (restart/stop/start/reload/daemon-reload/disable/enable 全面禁止)
#   - ファイル書き込みは OUTPUT_DIR のみ
#   - 個人情報は ANALYSIS_SALT で SHA256 ハッシュ化
#   - 秘匿値 (API_KEY/TOKEN/SECRET/PASSWORD) は [MASKED]
#   - 中断しても再実行可能 (冪等)
#
# ステップ一覧:
#   Step 0: 依存チェック
#   Step 1: DB 解析
#   Step 2: サービスマップ      (Part A.1 修正済み)
#   Step 3: 環境監査            (Part A.2 修正済み)
#   Step 4: Founder 利用パターン
#   Step 5: 隠れた機能の証拠収集
#   Step 6: テーブル timestamps  (Part B.1 新規)
#   Step 7: 隠れた機能の深部診断 (Part B.2 新規)
#   Step 8: サービス依存関係     (Part B.3 新規)
#
# 所要時間: 10〜15 分
# ============================================================

set -euo pipefail

# --- 設定 ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
export OUTPUT_DIR="${OUTPUT_DIR:-${SCRIPT_DIR}/../output}"
export KOKUZO_DB="${KOKUZO_DB:-/opt/tenmon-ark-data/kokuzo.sqlite}"
export REPO_PATH="${REPO_PATH:-/opt/tenmon-ark-repo}"

STATUS_FILE="$OUTPUT_DIR/.step_status.json"

# --- 引数パース ---
RUN_STEPS=""
RETRY_FAILED=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --step)
      RUN_STEPS="$2"
      shift 2
      ;;
    --retry-failed)
      RETRY_FAILED=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [--step 2,3,6] [--retry-failed]"
      echo ""
      echo "Options:"
      echo "  --step N,M,...    特定ステップのみ実行 (カンマ区切り)"
      echo "  --retry-failed    前回失敗したステップのみ再実行"
      echo "  --help            このヘルプを表示"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

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

# --- ステータス管理 ---
load_status() {
  if [[ -f "$STATUS_FILE" ]]; then
    cat "$STATUS_FILE"
  else
    echo '{}'
  fi
}

save_step_status() {
  local step_num="$1"
  local status="$2"
  local elapsed="$3"
  python3 -c "
import json, os
path = '$STATUS_FILE'
data = {}
if os.path.isfile(path):
    with open(path) as f:
        data = json.load(f)
data['step_$step_num'] = {'status': '$status', 'elapsed_sec': $elapsed, 'timestamp': '$(date -u +%Y-%m-%dT%H:%M:%SZ)'}
with open(path, 'w') as f:
    json.dump(data, f, indent=2)
"
}

should_run_step() {
  local step_num="$1"

  # --step オプション指定時
  if [[ -n "$RUN_STEPS" ]]; then
    if echo ",$RUN_STEPS," | grep -q ",$step_num,"; then
      return 0
    else
      return 1
    fi
  fi

  # --retry-failed オプション指定時
  if [[ "$RETRY_FAILED" == "true" ]]; then
    local prev_status
    prev_status=$(python3 -c "
import json, os
path = '$STATUS_FILE'
if os.path.isfile(path):
    with open(path) as f:
        data = json.load(f)
    step = data.get('step_$step_num', {})
    print(step.get('status', 'not_run'))
else:
    print('not_run')
" 2>/dev/null || echo "not_run")
    if [[ "$prev_status" == "failed" || "$prev_status" == "not_run" ]]; then
      return 0
    else
      return 1
    fi
  fi

  # デフォルト: 全ステップ実行
  return 0
}

# --- ヘッダー ---
echo "============================================================"
echo " TENMON_ARK_FULL_SYSTEM_ANALYSIS_V1 — Track B v2"
echo " VPS 解析オーケストレータ"
echo "============================================================"
echo " 開始時刻: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo " 出力先:   $OUTPUT_DIR"
echo " DB:       $KOKUZO_DB"
echo " Repo:     $REPO_PATH"
echo " Salt:     [SET, length=${#ANALYSIS_SALT}]"
if [[ -n "$RUN_STEPS" ]]; then
  echo " Mode:     --step $RUN_STEPS"
elif [[ "$RETRY_FAILED" == "true" ]]; then
  echo " Mode:     --retry-failed"
else
  echo " Mode:     全ステップ実行"
fi
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
TOTAL_STEPS=8
SUCCEEDED=0
FAILED=0
SKIPPED=0

run_step() {
  local step_num="$1"
  local step_name="$2"
  local script_path="$3"

  if ! should_run_step "$step_num"; then
    echo "[Step ${step_num}] ${step_name} — SKIPPED"
    SKIPPED=$((SKIPPED + 1))
    return 0
  fi

  echo "============================================================"
  echo "[Step ${step_num}/${TOTAL_STEPS}] ${step_name}"
  echo "============================================================"

  if [[ ! -f "$script_path" ]]; then
    echo "  ERROR: Script not found: $script_path"
    save_step_status "$step_num" "failed" 0
    FAILED=$((FAILED + 1))
    return 1
  fi

  local start_time
  start_time=$(date +%s)

  if bash "$script_path"; then
    local end_time
    end_time=$(date +%s)
    local elapsed=$((end_time - start_time))
    echo "  完了 (${elapsed}秒)"
    save_step_status "$step_num" "success" "$elapsed"
    SUCCEEDED=$((SUCCEEDED + 1))
  else
    local end_time
    end_time=$(date +%s)
    local elapsed=$((end_time - start_time))
    echo "  WARNING: Step ${step_num} failed (${elapsed}秒), continuing..."
    save_step_status "$step_num" "failed" "$elapsed"
    FAILED=$((FAILED + 1))
  fi
  echo ""
}

# --- 実行 ---
run_step 1 "DB 解析" \
  "${SCRIPT_DIR}/collect_db_inventory.sh"

run_step 2 "サービスマップ収集 (v2 修正版)" \
  "${SCRIPT_DIR}/collect_service_map.sh"

run_step 3 "環境監査 (v2 修正版)" \
  "${SCRIPT_DIR}/collect_env_audit.sh"

run_step 4 "Founder 利用パターン" \
  "${SCRIPT_DIR}/collect_founder_usage.sh"

run_step 5 "隠れた機能の証拠収集" \
  "${SCRIPT_DIR}/collect_hidden_feature_evidence.sh"

run_step 6 "テーブル timestamps (Part B.1)" \
  "${SCRIPT_DIR}/collect_table_timestamps.sh"

run_step 7 "隠れた機能の深部診断 (Part B.2)" \
  "${SCRIPT_DIR}/collect_hidden_feature_deep.sh"

run_step 8 "サービス依存関係 (Part B.3)" \
  "${SCRIPT_DIR}/collect_service_dependencies.sh"

# --- 完了サマリー ---
echo "============================================================"
echo " 解析完了"
echo "============================================================"
echo " 終了時刻: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo " 結果:     成功=${SUCCEEDED} / 失敗=${FAILED} / スキップ=${SKIPPED}"
echo ""
echo " 出力ファイル:"
find "$OUTPUT_DIR" -type f \( -name "*.json" -o -name ".step_status.json" \) | sort | while read -r f; do
  echo "   $(du -h "$f" | cut -f1)  $f"
done
echo ""

if [[ $FAILED -gt 0 ]]; then
  echo " ⚠ ${FAILED} ステップが失敗しました。再実行:"
  echo "   sudo -E bash $0 --retry-failed"
  echo ""
fi

echo " 次のステップ:"
echo "   cd /opt/tenmon-ark-repo"
echo "   git add analysis/track_b/output/"
echo "   git commit -m 'feat(analysis): 完全版 VPS データ収集 (all 8 steps completed)'"
echo "   git push origin feature/full-system-analysis-track-b"
echo ""
echo " ※ ANALYSIS_SALT を破棄してください:"
echo "   unset ANALYSIS_SALT"
echo "============================================================"
