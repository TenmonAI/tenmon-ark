#!/usr/bin/env bash
# BUILD_ACCEPTANCE_AUTORUN_V1
# selected_now 相当のカード検証を自動実行する最小 runner。
# 上位憲法索引: api/docs/constitution/SELF_BUILD_CONSTITUTION_AND_POLICY_V1.md（no-touch / acceptance gate / rollback）
# Task envelope: api/docs/constitution/SELF_BUILD_OBSERVE_AND_TASK_SCHEMA_V1.md（acceptanceGates.kind=script|build|health と対応づけ可）
# Decision plan: api/docs/constitution/SELF_BUILD_DECISION_AND_PATCH_PLANNER_V1.md（acceptancePlan → 本 runner の実行順序設計に利用可）
# 接続: REQUEST_PROBE_BINDER_V1 の acceptance script / required 束。
# 次カード候補: SEAL_OR_REJECT_JUDGE_V1
#
# 用法:
#   ./build_acceptance_autorun_v1.sh [--mode runtime|docs-only] [--acceptance PATH] [--card NAME] [--no-restart]
#
# - docs-only: npm run build のみ（health / restart / probe は N/A）
# - runtime（既定）: build + systemctl restart + health 待ち + acceptance（--acceptance 省略時は PATCH29 sweep）
#
# 環境変数:
#   NO_RESTART=1 … restart をスキップ（health のみ試行。CI 等）

set -euo pipefail

MODE="runtime"
ACCEPTANCE=""
CARD="${CARD:-BUILD_ACCEPTANCE_AUTORUN_V1}"
NO_RESTART="${NO_RESTART:-0}"

while [ $# -gt 0 ]; do
  case "$1" in
    --mode)
      MODE="$2"
      shift 2
      ;;
    --acceptance)
      ACCEPTANCE="$2"
      shift 2
      ;;
    --card)
      CARD="$2"
      shift 2
      ;;
    --no-restart)
      NO_RESTART=1
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--mode runtime|docs-only] [--acceptance SCRIPT] [--card NAME] [--no-restart]" >&2
      exit 0
      ;;
    *)
      echo "Unknown arg: $1 (try --help)" >&2
      exit 2
      ;;
  esac
done

TS="$(date -u +%Y%m%dT%H%M%SZ)"
DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
exec > >(tee -a "$DIR/run.log") 2>&1

echo "[BUILD_ACCEPTANCE_AUTORUN_V1] CARD=$CARD MODE=$MODE TS=$TS DIR=$DIR"
cd /opt/tenmon-ark-repo/api

echo "== build =="
npm run build

if [ "$MODE" = "docs-only" ]; then
  echo ""
  echo "[PASS] docs-only: build only (restart / health / probe N/A)"
  exit 0
fi

if [ "$MODE" != "runtime" ]; then
  echo "Invalid --mode: $MODE (use runtime or docs-only)" >&2
  exit 2
fi

if [ "$NO_RESTART" != "1" ]; then
  echo ""
  echo "== restart =="
  sudo systemctl restart tenmon-ark-api.service
else
  echo ""
  echo "== restart == (skipped NO_RESTART=1)"
fi

echo ""
echo "== health =="
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -fsS http://127.0.0.1:3000/health && break || sleep 1
done

echo ""
echo "== acceptance (probe) =="
EXIT=0
if [ -n "$ACCEPTANCE" ]; then
  bash "$ACCEPTANCE" || EXIT=$?
else
  /opt/tenmon-ark-repo/api/scripts/patch29_final_acceptance_sweep_v1.sh || EXIT=$?
fi

echo ""
if [ "$EXIT" -eq 0 ]; then
  echo "PASS"
else
  echo "FAIL"
fi
exit "$EXIT"
