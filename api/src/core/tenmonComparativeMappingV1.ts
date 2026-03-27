/**
 * KHS ↔ いろは ↔ カタカムナ ↔ サンスクリット ↔ 法華 ↔ 空海 の写像（root と混同禁止）。
 */

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

export function buildComparativeMappingV1(): ComparativeMappingBundleV1 {
  return {
    card: "TENMON_SELF_LEARNING_KHS_SANSKRIT_FRACTAL_AUTOSTUDY_CURSOR_AUTO_V1",
    comparativeMap: KHS_COMPARATIVE_MAP_EDGES_V1,
    mappedFromRoot: true,
    comparativeConflict: null,
    comparativeResolutionHint: "衝突時は root=KHS を固定し、他層は写像を一段だけ緩める。",
  };
}
