# TENMON_CONVERSATION_COMPLETION_STAGE1_SURFACE_AND_BLEED_PDCA_V1

会話 surface 汚染・fallback bleed・helper tail を最優先で止血する Stage1。

## ランナー

`api/automation/conversation_completion_stage1_surface_bleed_pdca_v1.py`

## 実行

```bash
cd /path/to/repo
python3 api/automation/conversation_completion_stage1_surface_bleed_pdca_v1.py
python3 api/automation/conversation_completion_stage1_surface_bleed_pdca_v1.py --skip-build
```

## 成果物

`api/automation/reports/TENMON_CONVERSATION_COMPLETION_STAGE1_SURFACE_AND_BLEED_PDCA_V1/<UTC>/`

- `baseline_summary_stage1.json`
- `surface_family_matrix_stage1.json`
- `patch_plan_stage1.md`
- `patch_result_stage1.json`
- `cycle_summary_stage1.json`
- `stage1_verdict.md`
- `run.log`

## 実装メモ（本リポ）

- **surface のみ**: `tenmonConversationSurfaceV1.ts` に `NATURAL_GENERAL_LLM_TOP` / `DEF_LLM_TOP` 向けの helper 剥がし・mission 抑止・監査行除去を追加。
- **canon 核ルート**（DEF_FASTPATH / SCRIPTURE / SUBCONCEPT / SOUL_FASTPATH / KATAKAMUNA）は Set 拡張で汚染しない。

## 次

- Stage1 acceptance 達成後: `TENMON_CONVERSATION_COMPLETION_STAGE2_CONTINUITY_AND_UNKNOWN_PDCA_V1`
