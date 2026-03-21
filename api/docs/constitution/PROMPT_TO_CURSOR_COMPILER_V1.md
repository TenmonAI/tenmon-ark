# PROMPT_TO_CURSOR_COMPILER_V1

**MODE:** `DOCS_FIRST` → `MIN_DIFF_PATCH`  
**API:** `GET /api/audit/prompt-to-cursor-compiler-v1?card=<CARD_NAME>`  
**出力:** `compiledPrompt` / `taskSummary` / `targetFiles` / `riskLabel` / `noTouch` / `acceptanceChecklist` / `rollbackHint` / `evidencePath` / `nextStepHint` / `reviewRequired` / `autoCandidateEligible`  
**必須:** カード契約を落とさない、no-touch・acceptance・rollback を必ず含む、high-risk は `reviewRequired`  
**次カード:** `FULL_AUTONOMOUS_BUILD_LOOP_V1`
