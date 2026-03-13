export type ExpressionPlan = {
  lengthMode: "short" | "medium" | "long";
  toneMode: "quiet" | "warm" | "clear" | "solemn";
  densityMode: "light" | "balanced" | "deep";
  sentenceFlow: "single_wave" | "two_wave" | "three_wave";
  questionMode: "none" | "one_soft_question" | "one_directional_question";
  lineBreakMode: "compact" | "airy";
  beautyMode: "plain_clean" | "luminous_japanese" | "scripture_centered";
};

export type ComfortTuning = {
  pressureLevel: "low" | "medium";
  emotionalDistance: "near" | "balanced" | "far";
  cadence: "gentle" | "steady" | "firm";
};

export function inferExpressionPlan(params: {
  routeReason?: string | null;
  centerMeaning?: string | null;
  response?: string | null;
}): ExpressionPlan {
  const rr = String(params.routeReason || "");
  const resp = String(params.response || "");
  const len = resp.length;

  if (rr === "TENMON_SCRIPTURE_CANON_V1") {
    return {
      lengthMode: len > 260 ? "long" : "medium",
      toneMode: "solemn",
      densityMode: "balanced",
      sentenceFlow: "two_wave",
      questionMode: "one_directional_question",
      lineBreakMode: "airy",
      beautyMode: "scripture_centered",
    };
  }

  if (rr === "R10_SELF_REFLECTION_ROUTE_V4_SAFE") {
    return {
      lengthMode: "medium",
      toneMode: "quiet",
      densityMode: "balanced",
      sentenceFlow: "two_wave",
      questionMode: "one_soft_question",
      lineBreakMode: "airy",
      beautyMode: "luminous_japanese",
    };
  }

  if (rr === "R22_CONVERSATIONAL_GENERAL_V1") {
    return {
      lengthMode: "short",
      toneMode: "warm",
      densityMode: "light",
      sentenceFlow: "single_wave",
      questionMode: "one_soft_question",
      lineBreakMode: "compact",
      beautyMode: "luminous_japanese",
    };
  }

  if (rr === "R22_RELATIONAL_WORLDVIEW_V1") {
    return {
      lengthMode: "medium",
      toneMode: "clear",
      densityMode: "balanced",
      sentenceFlow: "two_wave",
      questionMode: "one_directional_question",
      lineBreakMode: "airy",
      beautyMode: "luminous_japanese",
    };
  }

  if (rr === "DEF_FASTPATH_VERIFIED_V1" || rr === "DEF_DICT_HIT" || rr === "KATAKAMUNA_CANON_ROUTE_V1") {
    return {
      lengthMode: "medium",
      toneMode: "clear",
      densityMode: "balanced",
      sentenceFlow: "two_wave",
      questionMode: "one_directional_question",
      lineBreakMode: "airy",
      beautyMode: "plain_clean",
    };
  }

  return {
    lengthMode: "medium",
    toneMode: "clear",
    densityMode: "balanced",
    sentenceFlow: "single_wave",
    questionMode: "one_soft_question",
    lineBreakMode: "compact",
    beautyMode: "plain_clean",
  };
}

export function inferComfortTuning(params: {
  routeReason?: string | null;
  response?: string | null;
}): ComfortTuning {
  const rr = String(params.routeReason || "");

  if (rr === "TENMON_SCRIPTURE_CANON_V1") {
    return {
      pressureLevel: "medium",
      emotionalDistance: "balanced",
      cadence: "firm",
    };
  }

  if (rr === "R10_SELF_REFLECTION_ROUTE_V4_SAFE") {
    return {
      pressureLevel: "low",
      emotionalDistance: "balanced",
      cadence: "gentle",
    };
  }

  if (rr === "R22_CONVERSATIONAL_GENERAL_V1") {
    return {
      pressureLevel: "low",
      emotionalDistance: "balanced",
      cadence: "gentle",
    };
  }

  if (rr === "R22_RELATIONAL_WORLDVIEW_V1") {
    return {
      pressureLevel: "medium",
      emotionalDistance: "far",
      cadence: "steady",
    };
  }

  if (rr === "DEF_FASTPATH_VERIFIED_V1" || rr === "DEF_DICT_HIT" || rr === "KATAKAMUNA_CANON_ROUTE_V1") {
    return {
      pressureLevel: "medium",
      emotionalDistance: "far",
      cadence: "steady",
    };
  }

  return {
    pressureLevel: "medium",
    emotionalDistance: "balanced",
    cadence: "steady",
  };
}
