import { normalizeProviderPlan, type ProviderPlan } from "./providerPlan.js";

function hasFactualSignal(raw: string): boolean {
  return /日本の首相|アメリカ|どういう関係|誰|いつ|どこ|比較|違い|何が起きた/u.test(raw);
}
function hasDeepReadSignal(raw: string): boolean {
  return /サンスクリット|BHS|法華経|語根|真言|Dharma/u.test(raw);
}
function hasDefineSignal(rr: string): boolean {
  return rr === "DEF_FASTPATH_VERIFIED_V1" || rr === "DEF_DICT_HIT" || rr === "KATAKAMUNA_CANON_ROUTE_V1";
}

export function decideProviderPlan(params: {
  routeReason?: string | null;
  rawMessage?: string | null;
  centerMeaning?: string | null;
}): ProviderPlan {
  const rr = String(params.routeReason || "");
  const raw = String(params.rawMessage || "");

  if (rr === "TENMON_SCRIPTURE_CANON_V1" || rr === "R10_SELF_REFLECTION_ROUTE_V4_SAFE") {
    return normalizeProviderPlan({ helperModels: [] });
  }
  if (hasDeepReadSignal(raw)) {
    return normalizeProviderPlan({ helperModels: ["gpt-5-mini"] });
  }
  if (hasFactualSignal(raw) || rr === "R17_GENERAL_FACTUAL_SHADOW_ROUTE_V1") {
    return normalizeProviderPlan({ helperModels: ["gpt-5-mini", "breadth_shadow"] });
  }
  if (hasDefineSignal(rr)) {
    return normalizeProviderPlan({ helperModels: ["gpt-5-mini"] });
  }
  return normalizeProviderPlan({ helperModels: [] });
}

