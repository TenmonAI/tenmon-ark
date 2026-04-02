/**
 * digest / law / comparative / projection を会話メタへ橋渡し（検索で埋めない）。
 */

import type { KhsGengoLawKernelBundleV1 } from "./tenmonKhsGengoLawKernelV1.js";
import type { SanskritComparativeKernelBundleV1 } from "./tenmonSanskritComparativeKernelV1.js";
import type { ComparativeMappingBundleV1 } from "./tenmonComparativeMappingV1.js";
import type { FractalPhysicsProjectionBundleV1 } from "./tenmonFractalPhysicsProjectionV1.js";
import type { LawPromotionGateBundleV1 } from "./tenmonLawPromotionGateV1.js";

export type LearningConversationBridgeBundleV1 = {
  card: "TENMON_SELF_LEARNING_KHS_SANSKRIT_FRACTAL_AUTOSTUDY_CURSOR_AUTO_V1";
  learningBridgeReady: boolean;
  digestSummary: string;
  rootReasoningSummary: string;
  comparativeSummary: string;
  projectionSummary: string;
  promotionReasonCodes: readonly string[];
  ocrBindingPolicy: "source_analysis_memory_promotion_only";
};

export function buildLearningConversationBridgeV1(
  khs: KhsGengoLawKernelBundleV1,
  sanskrit: SanskritComparativeKernelBundleV1 | null,
  mapping: ComparativeMappingBundleV1,
  physics: FractalPhysicsProjectionBundleV1,
  gate: LawPromotionGateBundleV1,
): LearningConversationBridgeBundleV1 {
  const gateOk = gate.promotionGateVerdict === "allow" || gate.promotionGateVerdict === "observe";
  return {
    card: "TENMON_SELF_LEARNING_KHS_SANSKRIT_FRACTAL_AUTOSTUDY_CURSOR_AUTO_V1",
    learningBridgeReady: gateOk,
    digestSummary: `ledger メタ参照: promoted=${gate.promotedLawIds.length} blocked=${gate.blockedLawIds.length}`,
    rootReasoningSummary: khs.gengoLawCenter,
    comparativeSummary: sanskrit
      ? sanskrit.comparativeInsight
      : `mapping 層のみ: edges=${mapping.comparativeMap.length}（root=KHS 固定）`,
    projectionSummary: physics.fractalPhysicsHint,
    promotionReasonCodes: gate.reasonCodes,
    ocrBindingPolicy: "source_analysis_memory_promotion_only",
  };
}
