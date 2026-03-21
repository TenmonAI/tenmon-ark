# META_OPTIMIZER_V1

**MODE:** `DOCS_FIRST` → `MIN_DIFF_PATCH`  
**目的:** evolution ledger と DB 監査を入力に、**次に何をするか**を **単一 suggestedCard** と **confidence** で返す。  
**API:** `GET /api/audit/meta-optimizer-bundle-v1`（`META_OPTIMIZER_BUNDLE_V1`）  
**既存:** `GET /api/audit/evolution/meta-optimizer-v1`（`candidates[]` 互換）  
**dispatchMode:** `auto_low_risk_candidate` | `review_required` — **high-risk 自動昇格なし**（`noAutoEscalation: true`）  
**WMBW:** `willMeaningBeautyWorldviewReviewRequired: true`（主幹変更は別ゲートで人間承認）／`lowRiskAutoCandidatesOnly: true`  
**次カード:** `INTELLIGENCE_OS_MASTER_AUDIT_V1`（監査 GET）
