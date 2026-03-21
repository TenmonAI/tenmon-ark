# KOKUZO_SEED_LEARNING_BRIDGE_V1

**MODE:** `MIN_DIFF_PATCH`  
**目的:** `detailPlan.khsCandidates` を **保存物止まり**にせず、`thoughtCoreSummary` / `binderSummary` / `sourceStackSummary`（`sourceKinds`）へ **人間可読・法則キー非増殖**で橋渡しする。  
**実装:** `api/src/core/kokuzoSeedLearningBridgeV1.ts` → `finalize`（single-exit + wisdom reducer 前段）  
**次カード:** `EVOLUTION_LEDGER_V1`

**quarantine:** `sourceStackSummary.kokuzoBridgePath = quarantine_guarded`、空のときのみ `sourcePack = kokuzo_quarantine_guarded_v1`（本番直結ではなく guarded 面）。  
**acceptance（運用）:** build / health PASS、`ku` に `kokuzo_seed_material_v1` と橋ノートが載るケースを 1 回以上確認（`seed_learning_effect_audit_v1.sh` 等）。
