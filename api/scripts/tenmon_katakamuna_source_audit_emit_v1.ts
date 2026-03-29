/**
 * TENMON_KATAKAMUNA_SOURCE_AUDIT_AND_CLASSIFICATION — 自動化が捕捉する JSON を stdout へ。
 * cd api && npx tsx scripts/tenmon_katakamuna_source_audit_emit_v1.ts
 */
import { getKatakamunaSourceAuditAutomationPayloadV1 } from "../src/core/katakamunaSourceAuditClassificationV1.js";

console.log(JSON.stringify(getKatakamunaSourceAuditAutomationPayloadV1(), null, 2));
