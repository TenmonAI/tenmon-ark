export type HelperModelAlias =
  | "gpt-5-mini"
  | "gemini"
  | "breadth_shadow"
  | "fast_shadow";

export type ProviderPlan = {
  primaryRenderer: "gpt-5.4";
  helperModels: HelperModelAlias[];
  shadowOnly: true;
  finalAnswerAuthority: "gpt-5.4";
};

export function normalizeProviderPlan(x: any): ProviderPlan {
  const raw = Array.isArray(x?.helperModels) ? x.helperModels : [];
  const helperModels: HelperModelAlias[] = [];

  for (const v of raw) {
    if (
      v === "gpt-5-mini" ||
      v === "gemini" ||
      v === "breadth_shadow" ||
      v === "fast_shadow"
    ) {
      helperModels.push(v);
    }
  }

  return {
    primaryRenderer: "gpt-5.4",
    helperModels: Array.from(new Set(helperModels)),
    shadowOnly: true,
    finalAnswerAuthority: "gpt-5.4",
  };
}


