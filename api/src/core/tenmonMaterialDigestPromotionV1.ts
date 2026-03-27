/**
 * digest 条件と昇格段階（既存 digest ledger と整合・拡張メタのみ）。
 */

import type { MaterialDigestEntryV1, MaterialDigestStateV1 } from "./tenmonMaterialDigestLedgerV1.js";

export type ExtendedDigestStateV1 =
  | MaterialDigestStateV1
  | "promoted_law"
  | "promoted_alg"
  | "promoted_acceptance";

export type MaterialDigestPromotionBundleV1 = {
  card: "TENMON_SELF_LEARNING_KHS_SANSKRIT_FRACTAL_AUTOSTUDY_CURSOR_AUTO_V1";
  materialId: string;
  extendedState: ExtendedDigestStateV1;
  centerClaimReady: boolean;
  thoughtCoreSummaryReady: boolean;
  mixedQuestionRestorable: boolean;
  lawAxisReady: boolean;
  mappingConflictResolved: boolean;
};

/** 昇格は fail-closed: 全条件が揃うまで promoted_* にしない */
export function evaluateDigestPromotionV1(entry: MaterialDigestEntryV1): MaterialDigestPromotionBundleV1 {
  const hints = entry.promotionHints || [];
  const base = entry.state;
  let extended: ExtendedDigestStateV1 = base;
  const lawReady = hints.includes("law_kernel") || hints.includes("fractal_law");
  const center = hints.includes("centerClaim");
  const mixed = hints.includes("mixed_question_restored");
  const mappingOk = !hints.includes("mapping_layer_pending");

  if (base === "circulating" && lawReady && center && mixed && mappingOk) {
    extended = "promoted_law";
  }

  return {
    card: "TENMON_SELF_LEARNING_KHS_SANSKRIT_FRACTAL_AUTOSTUDY_CURSOR_AUTO_V1",
    materialId: entry.id,
    extendedState: extended,
    centerClaimReady: center,
    thoughtCoreSummaryReady: center,
    mixedQuestionRestorable: mixed,
    lawAxisReady: lawReady,
    mappingConflictResolved: mappingOk,
  };
}
