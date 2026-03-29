/**
 * TENMON_ARK_BOOK_CANON_LEDGER_AND_CONVERSATION_REUSE — 自動化 JSON stdout
 * cd api && npx tsx scripts/tenmon_ark_book_canon_ledger_emit_v1.ts
 */
import { getTenmonArkBookCanonLedgerAutomationPayloadV1 } from "../src/core/threadMeaningMemory.js";

console.log(JSON.stringify(getTenmonArkBookCanonLedgerAutomationPayloadV1(), null, 2));
