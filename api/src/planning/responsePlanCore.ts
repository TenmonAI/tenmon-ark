export type ResponsePlan = {
  routeReason: string;
  centerKey?: string | null;
  centerLabel?: string | null;
  scriptureKey?: string | null;
  mode: "greeting" | "canon" | "general";
  responseKind: "statement" | "statement_plus_question" | "instruction";
  semanticBody: string;
};

export function buildResponsePlan(input: {
  routeReason: string;
  rawMessage: string;
  centerKey?: string | null;
  centerLabel?: string | null;
  scriptureKey?: string | null;
  semanticBody: string;
  mode: "greeting" | "canon" | "general";
  responseKind?: "statement" | "statement_plus_question" | "instruction";
}): ResponsePlan {
  return {
    routeReason: String(input.routeReason || ""),
    centerKey: input.centerKey ?? null,
    centerLabel: input.centerLabel ?? null,
    scriptureKey: input.scriptureKey ?? null,
    mode: input.mode,
    responseKind: input.responseKind ?? "statement_plus_question",
    semanticBody: String(input.semanticBody || "").trim(),
  };
}
