# TENMON_CONVERSATION_COMPLETION_STAGE3_AUTONOMOUS_SEAL_PDCA_V1

## 目的

会話完成を seal 可能帯まで持ち上げる。workspace 観測と apply readiness を分離し、replay / gate / 機械 seal を一貫させる。

## 契約

- Stage1/2 acceptance 済みを前提とする。
- `null` を `true` 相当に扱わない。
- `replay_audit` の `acceptanceOk` はトップレベルまたは `acceptance.ok` の**明示 True**のみ合格。
- `workspace_observer` の `readyForApply`（厳密）と `readyForApplyApplySafe`（分類済み生成物のみ dirty 許容）を区別する。
- `dist/**` 直編集禁止。1 変更 = 1 検証。

## ランナー

- `api/automation/conversation_completion_stage3_autonomous_seal_pdca_v1.py`
- または `conversation_full_completion_pdca_autoloop_v1.py --report-card TENMON_CONVERSATION_COMPLETION_STAGE3_AUTONOMOUS_SEAL_PDCA_V1`

## 成果物（UTC フォルダ）

`api/automation/reports/TENMON_CONVERSATION_COMPLETION_STAGE3_AUTONOMOUS_SEAL_PDCA_V1/<UTC>/` に Stage3 バンドル（分類・forensic・acceptance 分離等）を出力する。
