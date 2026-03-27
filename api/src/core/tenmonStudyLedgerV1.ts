/**
 * TENMON_SELF_LEARNING_KHS_SANSKRIT_FRACTAL_AUTOSTUDY_CURSOR_AUTO_V1
 * 学習進行の ledger（メタのみ・本文捏造なし）。
 */

import {
  MATERIAL_DIGEST_LEDGER_CATALOG_V1,
  type MaterialDigestEntryV1,
  type MaterialDigestStateV1,
} from "./tenmonMaterialDigestLedgerV1.js";
import { evaluateDigestPromotionV1 } from "./tenmonMaterialDigestPromotionV1.js";

/** digest ledger に加え、昇格後の段階 */
export type StudyDigestPromotionStateV1 =
  | MaterialDigestStateV1
  | "promoted_law"
  | "promoted_alg"
  | "promoted_acceptance";

export type MaterialClassV1 = "root" | "mapping" | "comparative" | "auxiliary";

export type StudyLedgerEntryV1 = {
  materialId: string;
  materialClass: MaterialClassV1;
  digestState: StudyDigestPromotionStateV1;
  lastStudyAt: string | null;
  lawAxisCount: number;
  comparativeLinks: readonly string[];
  mixedQuestionReady: boolean;
  promotionState: "none" | "pending" | "law" | "alg" | "acceptance";
  notes: string;
};

export const STUDY_LEDGER_CARD_V1 = "TENMON_SELF_LEARNING_KHS_SANSKRIT_FRACTAL_AUTOSTUDY_CURSOR_AUTO_V1" as const;

/** 既定は空（fail-closed・運用で追記） */
export function emptyStudyLedgerV1(): readonly StudyLedgerEntryV1[] {
  return [];
}

function mapMaterialClassV1(entry: MaterialDigestEntryV1): MaterialClassV1 {
  if (entry.id === "siddham_sandoku") return "comparative";
  if (entry.category === "khs" || entry.category === "den") return "root";
  if (entry.category === "scripture" && entry.id !== "siddham_sandoku") return "mapping";
  if (entry.category === "practice") return "mapping";
  return "auxiliary";
}

function promotionStateFromDigest(extended: StudyDigestPromotionStateV1): StudyLedgerEntryV1["promotionState"] {
  if (extended === "promoted_law") return "law";
  if (extended === "promoted_alg") return "alg";
  if (extended === "promoted_acceptance") return "acceptance";
  if (extended === "circulating" || extended === "digested") return "pending";
  return "none";
}

/** digest catalog から study ledger 行を生成（運用・レポート用メタ） */
export function buildStudyLedgerEntriesV1(nowIso: string = new Date().toISOString()): readonly StudyLedgerEntryV1[] {
  return MATERIAL_DIGEST_LEDGER_CATALOG_V1.map((e) => {
    const prom = evaluateDigestPromotionV1(e);
    const hints = e.promotionHints || [];
    const lawAxisCount = hints.filter((h) => /law|fractal|kernel|axis/u.test(h)).length;
    const comparativeLinks =
      e.id === "siddham_sandoku"
        ? ["comparative_sanskrit", "悉曇"]
        : e.category === "scripture" && e.id !== "hokekyo"
          ? ["mapping_layer"]
          : [];
    return {
      materialId: e.id,
      materialClass: mapMaterialClassV1(e),
      digestState: prom.extendedState as StudyDigestPromotionStateV1,
      lastStudyAt: nowIso,
      lawAxisCount,
      comparativeLinks,
      mixedQuestionReady: hints.includes("mixed_question_restored"),
      promotionState: promotionStateFromDigest(prom.extendedState as StudyDigestPromotionStateV1),
      notes: `base_state=${e.state}; extended=${prom.extendedState}`,
    };
  });
}

/** TENMON_SANSKRIT_GODNAME_SCHEMA_AND_INGEST_CURSOR_AUTO_V2: ingest 結果の追跡用（メタのみ） */
export type SanskritGodnameIngestLedgerEntryV1 = {
  card: "TENMON_SANSKRIT_GODNAME_SCHEMA_AND_INGEST_CURSOR_AUTO_V2";
  materialId: string;
  ingestIndex: number;
  status: "accepted" | "rejected";
  validationErrors: string[];
  ingestedAt: string;
};

export function buildSanskritGodnameIngestLedgerRowsV1(args: {
  accepted: Array<{ index: number; materialId: string }>;
  rejected: Array<{ index: number; errors: string[] }>;
  nowIso?: string;
}): readonly SanskritGodnameIngestLedgerEntryV1[] {
  const ts = args.nowIso ?? new Date().toISOString();
  const out: SanskritGodnameIngestLedgerEntryV1[] = [];
  for (const a of args.accepted) {
    out.push({
      card: "TENMON_SANSKRIT_GODNAME_SCHEMA_AND_INGEST_CURSOR_AUTO_V2",
      materialId: a.materialId,
      ingestIndex: a.index,
      status: "accepted",
      validationErrors: [],
      ingestedAt: ts,
    });
  }
  for (const r of args.rejected) {
    out.push({
      card: "TENMON_SANSKRIT_GODNAME_SCHEMA_AND_INGEST_CURSOR_AUTO_V2",
      materialId: `reject:${r.index}`,
      ingestIndex: r.index,
      status: "rejected",
      validationErrors: [...r.errors],
      ingestedAt: ts,
    });
  }
  return out.sort((x, y) => x.ingestIndex - y.ingestIndex);
}
