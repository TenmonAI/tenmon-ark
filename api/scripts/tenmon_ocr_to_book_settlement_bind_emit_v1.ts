/**
 * TENMON_OCR_TO_BOOK_SETTLEMENT_BIND — probe JSON を stdout に出す（自動化が捕捉）。
 * Usage: cd api && npx tsx scripts/tenmon_ocr_to_book_settlement_bind_emit_v1.ts
 */
import { getTenmonOcrToBookSettlementBindProbePayloadV1 } from "../src/core/tenmonBookReadingKernelV1.js";

console.log(JSON.stringify(getTenmonOcrToBookSettlementBindProbePayloadV1(), null, 2));
