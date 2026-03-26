# TENMON_AUTONOMY_MORNING_APPROVAL_EXECUTION_CHAIN_CURSOR_AUTO_V1

## 目的

`tenmon_high_risk_morning_approval_list.json` のカードを **K1 → SUBCONCEPT → GENERAL** の鎖順で観測し、**approval → enqueue → Mac → result bundle** を 1 本の JSON で追えるようにする。成功の捏造はしない。

## D

- 最小 diff（automation / constitution のみ）
- 主線は **人間の `--approve` 後**の execution chain（本スクリプトは **自動で `--approve` しない**）
- 1 枚ずつ進める前提を `chain_gate_blocked_by` で表す
- product core 不変更

## 実行

```bash
export TENMON_REPO_ROOT=/path/to/tenmon-ark-repo
python3 api/automation/morning_approval_execution_chain_v1.py
```

任意:

- `TENMON_MORNING_APPROVAL_LIST` — morning list のパス
- `TENMON_MORNING_CHAIN_ORDER_JSON` — 鎖順の上書き（JSON 配列）

## enqueue（人間）

```bash
cd "${TENMON_REPO_ROOT}/api"
./scripts/high_risk_escrow_approval_bridge_v1.sh <CARD_ID> --approve --approve-by "$(whoami)"
```

（morning list 各項目の `approve_command` と同義）

## 出力

`api/automation/morning_approval_execution_chain_summary.json`

- `executed_cards` — `queue_state=executed` かつ bundle に同一 `queue_id` の entry が 1 件以上
- `pending_cards` — 未完了（鎖ゲート・phase・`approve_command`）
- `failed_cards` — `rejected` 等の明確な失敗
- `chain_order_effective` / `chain_order_ok` — 前段未完了のまま後段だけ `complete` なら違反として記録
- `checks` — `queue_ready` / `mac_pickup_delivered` / `result_entry`

## next

- **nextOnPass**: `TENMON_PWA_WORLDCLASS_DIALOGUE_FINAL_ASCENT_CURSOR_AUTO_V1`
- **nextOnFail**: 停止。approval chain retry 1 枚のみ生成。
