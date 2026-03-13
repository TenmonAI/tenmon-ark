export type ShadowResult = {
  facts: string[];
  candidates: string[];
  uncertainties: string[];
  sourcesHint: string[];
};

export function emptyShadowResult(): ShadowResult {
  return {
    facts: [],
    candidates: [],
    uncertainties: [],
    sourcesHint: [],
  };
}

export function normalizeShadowResult(x: any): ShadowResult {
  const arr = (v: any) => Array.isArray(v) ? v.map((s) => String(s || "").trim()).filter(Boolean) : [];
  return {
    facts: arr(x?.facts),
    candidates: arr(x?.candidates),
    uncertainties: arr(x?.uncertainties),
    sourcesHint: arr(x?.sourcesHint),
  };
}

export async function runBreadthShadow(_params: {
  query: string;
  providerPlan: any;
}): Promise<ShadowResult> {
  return emptyShadowResult();
}
