# FULL_AUTONOMOUS_BUILD_LOOP_V1

**MODE:** `DOCS_FIRST` → `MIN_DIFF_PATCH` → `FORENSIC`  
**API:** `GET /api/audit/full-autonomous-build-loop-v1` — ループ定義・到達度・人間承認点の **読み取り専用** 集約  
**ループ:** observe → decide → compile_prompt → dispatch → execute → acceptance → rollback_or_quarantine → learn → next_card  
**完了時フィールド:** `autonomousBuildReach` / `practicalCompletionReach` / `supremeCompletionReach` / `remainingHighRiskAreas` / `humanApprovalRequiredFor`  
**必須:** `evidenceBundlePathRequired: true`、単一 `nextCard`（既定 `FINAL_AUTONOMOUS_ASCENT_DELTA_V1`）、stale dist 検知（`staleDistHeuristic`）  
**次カード:** `FINAL_AUTONOMOUS_ASCENT_DELTA_V1`
