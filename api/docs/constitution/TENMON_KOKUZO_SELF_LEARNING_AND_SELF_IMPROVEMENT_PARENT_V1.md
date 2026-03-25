# TENMON_KOKUZO_SELF_LEARNING_AND_SELF_IMPROVEMENT_PARENT_V1

## Cursor カード

`TENMON_KOKUZO_SELF_LEARNING_AND_SELF_IMPROVEMENT_PARENT_CURSOR_AUTO_V1`

## 目的

虚空蔵高速学習（KHS 自動学習ループ）と自己改善 OS を **安全に統合**する。  
P20/HYBRID の detailPlan 契約安定化、BAD 汚染の観測・遮断、KHS 健全性ゲート、Seed、会話還元、美文レンダ、自己改善 OS 接続までを **9 段階**で導入する。

## 生成器

| 種別 | パス |
|------|------|
| Generator | `api/automation/kokuzo_self_learning_parent_generator_v1.py` |
| Schema | `api/automation/kokuzo_self_learning_parent_schema_v1.json` |
| VPS | `api/scripts/tenmon_kokuzo_self_learning_parent_run_v1.sh` |

```bash
python3 api/automation/kokuzo_self_learning_parent_generator_v1.py --ts-folder RUN_ID --stdout-json
```

## 9 段（1 カード 1 主題）

1. **S01** — P20 / HYBRID detailPlan 契約安定化（`kokuzoDetailPlanStabilityV1` スタンプ等）  
2. **S02** — BAD 観測（`badContaminationGateV1` + qc 設計）  
3. **S03** — BAD 遮断  
4. **S04** — KHS 健全性ゲート（`khs/healthGateV1`）  
5. **S05** — KHS Seed 生成（`seed/khsSeedContractV1`）  
6. **S06** — 会話還元  
7. **S07** — 美文レンダ  
8. **S08** — 高速学習ループ配線（`learner`）  
9. **S09** — 自己改善 OS 統合（`chat_refactor_os_runner_v1` 等）

## 成果物（生成）

- `generated_cursor_apply/TENMON_KOKUZO_SL_S0*_CURSOR_AUTO_V1.md` ×9  
- `generated_cursor_apply/TENMON_KOKUZO_SELF_LEARNING_AND_SELF_IMPROVEMENT_PARENT_CURSOR_AUTO_V1.md`  
- `generated_vps_cards/<ts>/TENMON_KOKUZO_SL_S0*_VPS_V1.sh` ×9  
- `generated_vps_cards/<ts>/TENMON_KOKUZO_SELF_LEARNING_AND_SELF_IMPROVEMENT_PARENT_VPS_V1.sh`  
- `integrated_learning_os_manifest.json` / `integrated_final_verdict.json`

## VPS_VALIDATION_OUTPUTS

- `TENMON_KOKUZO_SELF_LEARNING_AND_SELF_IMPROVEMENT_PARENT_VPS_V1`
- `integrated_learning_os_manifest.json`
- `integrated_final_verdict.json`

## FAIL_NEXT_CARD

`TENMON_KOKUZO_SELF_LEARNING_AND_SELF_IMPROVEMENT_PARENT_RETRY_CURSOR_AUTO_V1`

## ポリシー

- **1 変更 1 検証** / **PASS 以外封印禁止**  
- FAIL 時は evidence + next card（`FAIL_NEXT`）を残す  
- 学習結果の **無審査本番反映禁止**

## DO_NOT_TOUCH

- `dist/**`、kokuzo_pages 正文の自動改変、DB 無差別マイグレ、systemd 無計画変更  
- `/api/chat` 契約、`res.json` 単一出口、route 本体の大規模再配線
