/**
 * digest 済み法則のみ昇格（未 digest は会話根幹へ入れない）。
 */

import type { MaterialDigestPromotionBundleV1 } from "./tenmonMaterialDigestPromotionV1.js";

export type LawPromotionGateBundleV1 = {
  card: "TENMON_SELF_LEARNING_KHS_SANSKRIT_FRACTAL_AUTOSTUDY_CURSOR_AUTO_V1";
  promotionGateVerdict: "allow" | "block" | "observe";
  promotedLawIds: readonly string[];
  blockedLawIds: readonly string[];
  promotionReason: string;
};

export function resolveLawPromotionGateV1(promotions: readonly MaterialDigestPromotionBundleV1[]): LawPromotionGateBundleV1 {
  const promoted: string[] = [];
  const blocked: string[] = [];
  for (const p of promotions) {
    if (p.extendedState === "promoted_law" || p.extendedState === "promoted_alg" || p.extendedState === "promoted_acceptance") {
      promoted.push(p.materialId);
    } else {
      blocked.push(p.materialId);
    }
  }
  const verdict: LawPromotionGateBundleV1["promotionGateVerdict"] =
    promoted.length > 0 ? "allow" : blocked.length > 0 ? "observe" : "block";
  return {
    card: "TENMON_SELF_LEARNING_KHS_SANSKRIT_FRACTAL_AUTOSTUDY_CURSOR_AUTO_V1",
    promotionGateVerdict: verdict,
    promotedLawIds: promoted,
    blockedLawIds: blocked,
    promotionReason: "昇格は digest 判定で promoted_* のみ。未 digest は会話根幹へ載せない。",
  };
}
