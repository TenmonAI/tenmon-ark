# EVOLUTION_LEDGER_V1

**MODE:** `DOCS_FIRST` → `MIN_DIFF_PATCH`  
**目的:** 改善の **因果追跡**（before/after 機械可読）を `evolution_ledger_v1` に蓄積する。  
**スキーマ:** `api/src/db/training_schema.sql`（kokuzo 適用チェーン）  
**runtime:** `api/src/core/evolutionLedgerV1.ts` — `tryAppendEvolutionLedgerSnapshotOnceV1`（**finalize 完了応答 1 リクエスト 1 行**）  
**拒否・rollback:** `appendEvolutionLedgerRejectOrRollbackV1`  
**次カード:** `META_OPTIMIZER_V1`

**列:** eventId, sourceCard, changedLayer, beforeSummary, afterSummary, affectedRoute, affectedSourcePack, affectedDensity, affectedProse, regressionRisk, acceptedBy, status, createdAt
