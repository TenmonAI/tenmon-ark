#!/usr/bin/env bash
# ============================================================
# run_partial_analysis.sh — 部分実行スクリプト
# TENMON_ARK_FULL_SYSTEM_ANALYSIS_V1 / Track B v2
# ============================================================
# 使い方:
#   # 特定ステップのみ再実行
#   sudo -E bash run_partial_analysis.sh 2 3
#
#   # 新規ステップのみ実行
#   sudo -E bash run_partial_analysis.sh 6 7 8
#
#   # 単一ステップのみ
#   sudo -E bash run_partial_analysis.sh 2
#
#   # 全ステップ（run_full_analysis.sh と同等）
#   sudo -E bash run_partial_analysis.sh all
#
# ステップ番号:
#   1 = collect_db_inventory.sh             (DB解析)
#   2 = collect_service_map.sh              (サービスマップ v2)
#   3 = collect_env_audit.sh                (環境監査 v2)
#   4 = collect_founder_usage.sh            (Founder利用パターン)
#   5 = collect_hidden_feature_evidence.sh  (隠れた機能証拠)
#   6 = collect_table_timestamps.sh         (テーブル timestamps)
#   7 = collect_hidden_feature_deep.sh      (隠れた機能 深部診断)
#   8 = collect_service_dependencies.sh     (サービス依存関係)
#
# 前提:
#   - ANALYSIS_SALT 環境変数が設定されていること
#   - sudo 権限で実行すること
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
export OUTPUT_DIR="${OUTPUT_DIR:-${SCRIPT_DIR}/../output}"
export KOKUZO_DB="${KOKUZO_DB:-/opt/tenmon-ark-data/kokuzo.sqlite}"
export REPO_PATH="${REPO_PATH:-/opt/tenmon-ark-repo}"
mkdir -p "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/hidden_feature_evidence"

# ステップ定義
declare -A STEP_SCRIPTS=(
    [1]="collect_db_inventory.sh"
    [2]="collect_service_map.sh"
    [3]="collect_env_audit.sh"
    [4]="collect_founder_usage.sh"
    [5]="collect_hidden_feature_evidence.sh"
    [6]="collect_table_timestamps.sh"
    [7]="collect_hidden_feature_deep.sh"
    [8]="collect_service_dependencies.sh"
)

declare -A STEP_NAMES=(
    [1]="DB Inventory"
    [2]="Service Map (v2)"
    [3]="Environment Audit (v2)"
    [4]="Founder Usage"
    [5]="Hidden Feature Evidence"
    [6]="Table Timestamps"
    [7]="Hidden Feature Deep Diagnosis"
    [8]="Service Dependencies"
)

# 引数チェック
if [ $# -eq 0 ]; then
    echo "Usage: $0 <step_numbers...> | all" >&2
    echo "" >&2
    echo "Steps:" >&2
    for i in 1 2 3 4 5 6 7 8; do
        echo "  $i = ${STEP_NAMES[$i]} (${STEP_SCRIPTS[$i]})" >&2
    done
    echo "" >&2
    echo "Examples:" >&2
    echo "  sudo -E bash $0 2 3       # Re-run steps 2 and 3 only" >&2
    echo "  sudo -E bash $0 6 7 8     # Run new steps only" >&2
    echo "  sudo -E bash $0 all       # Run all steps" >&2
    exit 1
fi

# ANALYSIS_SALT チェック
if [ -z "${ANALYSIS_SALT:-}" ]; then
    echo "[ERROR] ANALYSIS_SALT is not set. Run: export ANALYSIS_SALT=\$(openssl rand -hex 32)" >&2
    exit 1
fi

# 実行対象ステップの決定
if [ "$1" = "all" ]; then
    STEPS=(1 2 3 4 5 6 7 8)
else
    STEPS=("$@")
fi

echo "============================================================" >&2
echo " TENMON-ARK Partial Analysis v2" >&2
echo " Steps to run: ${STEPS[*]}" >&2
echo " Output: $OUTPUT_DIR" >&2
echo "============================================================" >&2

TOTAL=${#STEPS[@]}
SUCCESS=0
FAILED=0
FAILED_STEPS=""

for step_num in "${STEPS[@]}"; do
    # ステップ番号の妥当性チェック
    if [ -z "${STEP_SCRIPTS[$step_num]+x}" ]; then
        echo "[WARN] Unknown step number: $step_num (skipping)" >&2
        continue
    fi

    script="${STEP_SCRIPTS[$step_num]}"
    name="${STEP_NAMES[$step_num]}"
    script_path="${SCRIPT_DIR}/${script}"

    echo "" >&2
    echo "--- Step $step_num: $name ---" >&2

    if [ ! -f "$script_path" ]; then
        echo "[ERROR] Script not found: $script_path" >&2
        FAILED=$((FAILED + 1))
        FAILED_STEPS="${FAILED_STEPS} ${step_num}(${name})"
        continue
    fi

    START_TIME=$(date +%s)
    if timeout 300 bash "$script_path"; then
        END_TIME=$(date +%s)
        ELAPSED=$((END_TIME - START_TIME))
        echo "[OK] Step $step_num ($name) completed in ${ELAPSED}s" >&2
        SUCCESS=$((SUCCESS + 1))
    else
        END_TIME=$(date +%s)
        ELAPSED=$((END_TIME - START_TIME))
        echo "[FAIL] Step $step_num ($name) failed after ${ELAPSED}s" >&2
        FAILED=$((FAILED + 1))
        FAILED_STEPS="${FAILED_STEPS} ${step_num}(${name})"
    fi
done

echo "" >&2
echo "============================================================" >&2
echo " Partial Analysis Complete" >&2
echo " Success: $SUCCESS / $TOTAL" >&2
if [ $FAILED -gt 0 ]; then
    echo " Failed: $FAILED —${FAILED_STEPS}" >&2
fi
echo " Output: $OUTPUT_DIR" >&2
echo "============================================================" >&2

# 失敗があった場合は非ゼロで終了
[ $FAILED -eq 0 ]
