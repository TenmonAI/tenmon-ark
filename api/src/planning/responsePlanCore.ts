
export type AnswerLength = "short" | "medium" | "long";
export type AnswerMode = "support" | "define" | "analysis" | "worldview" | "continuity";
export type AnswerFrame =
  | "one_step"
  | "statement_plus_one_question"
  | "d_delta_s_one_step";

export type AnswerProfile = {
  answerLength?: AnswerLength | null;
  answerMode?: AnswerMode | null;
  answerFrame?: AnswerFrame | null;
};

/** FINAL_DENSITY_CONTRACT_AND_GENERAL_SOURCEPACK_V1 */
export type DensityContractV1 = {
  densityTarget: "medium" | "high";
  mustGroundOneLayer: boolean;
  mustCompressToCenterClaim: boolean;
  mustEndWithActionOrAxis: boolean;
};

export type ResponsePlan = {
  routeReason: string;
  centerKey?: string | null;
  centerLabel?: string | null;
  scriptureKey?: string | null;
  mode: "greeting" | "canon" | "general";
  responseKind: "statement" | "statement_plus_question" | "instruction";
  semanticBody: string;
  answerFrame?: AnswerFrame | null;
  /** 密度契約（projector / reducer が参照。任意） */
  densityContract?: DensityContractV1 | null;
};

export function buildResponsePlan(input: {
  routeReason: string;
  rawMessage: string;
  centerKey?: string | null;
  centerLabel?: string | null;
  scriptureKey?: string | null;
  semanticBody: string;
  mode: "greeting" | "canon" | "general";
  answerMode?: AnswerMode | null;
  answerFrame?: AnswerFrame | null;
  responseKind?: "statement" | "statement_plus_question" | "instruction";
}): ResponsePlan {
  return {
    answerFrame: input.answerFrame ?? null,
    routeReason: String(input.routeReason || ""),
    centerKey: input.centerKey ?? null,
    centerLabel: input.centerLabel ?? null,
    scriptureKey: input.scriptureKey ?? null,
    mode: input.mode,
    responseKind: input.responseKind ?? "statement_plus_question",
    semanticBody: String(input.semanticBody || "").trim(),
  };
}
