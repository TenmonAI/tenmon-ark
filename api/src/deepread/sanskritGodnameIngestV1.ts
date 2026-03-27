/**
 * TENMON_SANSKRIT_GODNAME_INGEST_V1 — batch ingest + fail-closed reject list + ledger rows。
 */

import {
  normalizeSanskritGodnameRecordV1,
  validateSanskritGodnameRecordV1,
  type SanskritGodnameTableRecordV1,
} from "./sanskritGodnameSchemaV1.js";
import { buildSanskritGodnameIngestLedgerRowsV1 } from "../core/tenmonStudyLedgerV1.js";
import { runSanskritRootEngineV1, type SanskritRootEngineOutputV1 } from "./sanskritRootEngineV1.js";
import { runTenmonGodnameMapperV1, type TenmonGodnameMapperOutputV1 } from "./tenmonGodnameMapperV1.js";
import { buildTenmonGodnameRelationsV1, type TenmonGodnameRelationsGraphV1 } from "./tenmonGodnameRelationsV1.js";
import { judgeSanskritAlignmentV1, type SanskritAlignmentJudgeOutputV1 } from "./sanskritAlignmentJudgeV1.js";
import { buildSanskritDeepreadSurfaceV1 } from "./sanskritDeepreadSurfaceV1.js";

export type SanskritGodnameIngestAcceptedV1 = {
  index: number;
  materialId: string;
  record: SanskritGodnameTableRecordV1;
};

export type SanskritGodnameIngestRejectedV1 = {
  index: number;
  errors: string[];
  raw: unknown;
};

export type SanskritGodnameIngestResultV1 = {
  card: "TENMON_SANSKRIT_GODNAME_SCHEMA_AND_INGEST_CURSOR_AUTO_V2";
  ok: boolean;
  accepted: SanskritGodnameIngestAcceptedV1[];
  rejected: SanskritGodnameIngestRejectedV1[];
  ledger: ReturnType<typeof buildSanskritGodnameIngestLedgerRowsV1>;
};

export type SanskritGodnameSeparatedAnalysisV1 = {
  materialId: string;
  strict: SanskritRootEngineOutputV1;
  mapping: TenmonGodnameMapperOutputV1;
  relations_graph: TenmonGodnameRelationsGraphV1;
  alignment: SanskritAlignmentJudgeOutputV1;
  surface_fixed: string;
};

function materialIdFromRecord(rec: SanskritGodnameTableRecordV1): string {
  const base = rec.japanese_name.replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 64);
  return `godname:${base || "unknown"}`;
}

export function ingestSanskritGodnameBatchV1(input: unknown): SanskritGodnameIngestResultV1 {
  const items: unknown[] = Array.isArray(input) ? input : [input];
  const accepted: SanskritGodnameIngestAcceptedV1[] = [];
  const rejected: SanskritGodnameIngestRejectedV1[] = [];

  for (let i = 0; i < items.length; i++) {
    const raw = items[i];
    const v = validateSanskritGodnameRecordV1(raw);
    if (!v.ok) {
      rejected.push({ index: i, errors: v.errors, raw });
      continue;
    }
    const normalized = normalizeSanskritGodnameRecordV1(v.record);
    accepted.push({
      index: i,
      materialId: materialIdFromRecord(normalized),
      record: normalized,
    });
  }

  const ok = rejected.length === 0;
  const ledger = buildSanskritGodnameIngestLedgerRowsV1({
    accepted: accepted.map((a) => ({ index: a.index, materialId: a.materialId })),
    rejected: rejected.map((r) => ({ index: r.index, errors: r.errors })),
  });

  return {
    card: "TENMON_SANSKRIT_GODNAME_SCHEMA_AND_INGEST_CURSOR_AUTO_V2",
    ok,
    accepted,
    rejected,
    ledger,
  };
}

/** strict 層と tenmon 層を混ぜずに返す（accepted のみ）。 */
export function analyzeAcceptedSanskritGodnameRecordsV1(
  accepted: SanskritGodnameIngestAcceptedV1[],
): SanskritGodnameSeparatedAnalysisV1[] {
  return accepted.map((a) => {
    const strict = runSanskritRootEngineV1(a.record);
    const mapping = runTenmonGodnameMapperV1(a.record);
    const alignment = judgeSanskritAlignmentV1({ strict, mapping });
    const surface_fixed = buildSanskritDeepreadSurfaceV1({
      word: a.record.japanese_name,
      strict,
      mapping,
      alignment,
    });
    return {
      materialId: a.materialId,
      strict,
      mapping,
      relations_graph: buildTenmonGodnameRelationsV1(a.record),
      alignment,
      surface_fixed,
    };
  });
}
