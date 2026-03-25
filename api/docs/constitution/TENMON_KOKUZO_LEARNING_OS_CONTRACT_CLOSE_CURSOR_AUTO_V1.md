# TENMON_KOKUZO_LEARNING_OS_CONTRACT_CLOSE_CURSOR_AUTO_V1

## 目的

`kokuzo learning + self improvement integration` の canonical output contract を閉じる。
`integrated_final_verdict.json` / `learning_steps.json` を含む必須成果物を固定し、`rc=1` の理由を blocker JSON へ必ず出力する。

## canonical out

- `api/automation/out/tenmon_kokuzo_learning_improvement_os_v1`

## 必須成果物

- `integrated_learning_verdict.json`
- `integrated_final_verdict.json`
- `learning_improvement_os_manifest.json`
- `learning_steps.json`
- `next_card_dispatch.json`

## 必須追加成果物（contract close）

- `kokuzo_learning_contract_blockers.json`（`rc=1` の理由を列挙）
- `TENMON_KOKUZO_LEARNING_OS_CONTRACT_CLOSE_VPS_V1`（VPS マーカー）

## ポリシー

- `structural_ok` でも canonical 必須成果物が欠けていれば `partial` 扱い。
- `rc` は `kokuzo_learning_contract_blockers.json` の blocker 状態と一致させる。
- `rc=1` のとき `fail_next_cursor_card` は
  `TENMON_KOKUZO_LEARNING_OS_CONTRACT_CLOSE_RETRY_CURSOR_AUTO_V1`。

## 実装

- `api/automation/kokuzo_learning_os_contract_close_v1.py`
- `api/scripts/kokuzo_learning_os_contract_close_v1.sh`

## 実行例

```bash
# canonical を整える（不足ファイル補完 + blocker 判定）
bash api/scripts/kokuzo_learning_os_contract_close_v1.sh --stdout-json

# 先に統合 runner を回してから contract close
bash api/scripts/kokuzo_learning_os_contract_close_v1.sh --run-pipeline --stdout-json
```

## VPS_VALIDATION_OUTPUTS

- `TENMON_KOKUZO_LEARNING_OS_CONTRACT_CLOSE_VPS_V1`
- `integrated_final_verdict.json`
- `learning_steps.json`
- `kokuzo_learning_contract_blockers.json`

## FAIL_NEXT_CARD

`TENMON_KOKUZO_LEARNING_OS_CONTRACT_CLOSE_RETRY_CURSOR_AUTO_V1`

