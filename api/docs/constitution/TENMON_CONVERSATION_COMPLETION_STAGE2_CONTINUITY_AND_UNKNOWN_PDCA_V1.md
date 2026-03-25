# TENMON_CONVERSATION_COMPLETION_STAGE2_CONTINUITY_AND_UNKNOWN_PDCA_V1

Stage1 達成後に実施。継続会話の主権・carry 表面・unknown bridge を観測する。

## ランナー

`api/automation/conversation_completion_stage2_continuity_unknown_pdca_v1.py`

```bash
cd /path/to/repo
python3 api/automation/conversation_completion_stage2_continuity_unknown_pdca_v1.py
python3 api/automation/conversation_completion_stage2_continuity_unknown_pdca_v1.py --skip-build
```

## 成果物

`api/automation/reports/TENMON_CONVERSATION_COMPLETION_STAGE2_CONTINUITY_AND_UNKNOWN_PDCA_V1/<UTC>/`

- `continuity_reset_audit_stage2.json`
- `unknown_bridge_audit_stage2.json`
- `carry_projection_matrix_stage2.json`
- `patch_plan_stage2.md`
- `patch_result_stage2.json`
- `cycle_summary_stage2.json`
- `stage2_verdict.md`
- `baseline_probes_stage2.json`
- `run.log`

## 実装メモ（本リポ）

- **3点表面**: `threadCoreLinkSurfaceV1.formatStage2ConversationCarryBlockV1` — 【前回の芯】【いまの差分】【次の一手】+ 水火／五十音エコー（継続 PDCA ヒューリスティック整合）。
- **unknown bridge**: `general_trunk_v1.tryUnknownTermBridgeExitV1` → `TENMON_UNKNOWN_TERM_BRIDGE_V1`（観測→近傍→読みの方向→次の一点→保留）。
- **routeClass 整合**: `responsePlanCore.clampKuRouteClassToAnswerFrameV1`（ゲートで ku を正規化）。

## acceptance（スクリプト内）

- `continuity_link_hit_rate >= 92`
- `one_step_visibility_rate >= 96`
- `unknown_bridge_completion >= 90`
- `continuity_bad <= 1`
- `route_reason_mismatch = 0`
- `responsePlan` / `threadCore` 欠落 0
- build / health OK

## 次

- 達成後: `TENMON_CONVERSATION_COMPLETION_STAGE3_AUTONOMOUS_SEAL_PDCA_V1`
- Stage1 再発時は Stage1 へ戻す
