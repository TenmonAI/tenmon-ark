/**
 * KHS ↔ いろは ↔ カタカムナ ↔ サンスクリット ↔ 法華 ↔ 空海 の写像（root と混同禁止）。
 * TENMON_ARK_BOOK_CANON_LEDGER_AND_CONVERSATION_REUSE: judge 済み比較束を hint に合流（Notion 原文は載せない）。
 * knowledgeBinder → getSelfLearningAutostudyBundleV1(..., { arkBookCanonConversationReuseV1 }) 経由で注入。
 */

import type { ArkBookCanonConversationReuseV1 } from "./threadMeaningMemory.js";

export { ARK_BOOK_CANON_PRIORITY_BOOK_IDS_V1 } from "./threadMeaningMemory.js";

export type ComparativeEdgeV1 = {
  id: string;
  from: "KHS";
  to: string;
  layer: "mapping" | "comparative";
};

export const KHS_COMPARATIVE_MAP_EDGES_V1: readonly ComparativeEdgeV1[] = [
  { id: "khs_iroha", from: "KHS", to: "いろは言霊解", layer: "mapping" },
  { id: "khs_katakamuna", from: "KHS", to: "カタカムナ言霊解", layer: "mapping" },
  { id: "khs_hokekyo", from: "KHS", to: "法華経", layer: "mapping" },
  { id: "khs_kukai", from: "KHS", to: "空海・伝承", layer: "mapping" },
  { id: "khs_sanskrit", from: "KHS", to: "サンスクリット", layer: "comparative" },
  { id: "khs_siddham", from: "KHS", to: "悉曇", layer: "comparative" },
] as const;

export type ComparativeMappingBundleV1 = {
  card: "TENMON_SELF_LEARNING_KHS_SANSKRIT_FRACTAL_AUTOSTUDY_CURSOR_AUTO_V1";
  comparativeMap: readonly ComparativeEdgeV1[];
  mappedFromRoot: true;
  comparativeConflict: string | null;
  comparativeResolutionHint: string;
};

export function buildComparativeMappingV1(opts?: {
  bookCanonReuse?: ArkBookCanonConversationReuseV1 | null;
}): ComparativeMappingBundleV1 {
  let comparativeResolutionHint = "衝突時は root=KHS を固定し、他層は写像を一段だけ緩める。";
  const ru = opts?.bookCanonReuse;
  if (ru?.reuse_for_routes.comparison_digest?.length) {
    comparativeResolutionHint += ` ark_reuse:「${ru.reuse_for_routes.comparison_digest.slice(0, 4).join("｜")}」`;
  }
  if (ru?.uncertainty_registry.flags.length) {
    comparativeResolutionHint += ` unc:「${ru.uncertainty_registry.flags.slice(0, 4).join("｜")}」`;
  }
  return {
    card: "TENMON_SELF_LEARNING_KHS_SANSKRIT_FRACTAL_AUTOSTUDY_CURSOR_AUTO_V1",
    comparativeMap: KHS_COMPARATIVE_MAP_EDGES_V1,
    mappedFromRoot: true,
    comparativeConflict: null,
    comparativeResolutionHint,
  };
}
