/**
 * CHAT_SAFE_REFACTOR_PATCH6_FINALIZE_SINGLE_EXIT_V1
 * 主要出口を single-exit 化する最小ヘルパ。
 */

export function finalizeSingleExitV1(
  res: any,
  __tenmonGeneralGateResultMaybe: any,
  payload: any
) {
  try {
    const __df: any = payload?.decisionFrame || null;
    const __ku: any =
      __df && __df.ku && typeof __df.ku === "object" && !Array.isArray(__df.ku)
        ? __df.ku
        : null;

    const __routeReason = String(__ku?.routeReason || "");
    const __routeClass = __ku?.routeClass ?? null;

    console.log("[FINALIZE_EXIT_MAP_V1]", {
      routeReason: __routeReason || null,
      routeClass: __routeClass,
      answerLength: __ku?.answerLength ?? null,
      answerMode: __ku?.answerMode ?? null,
      answerFrame: __ku?.answerFrame ?? null,
      hasResponsePlan: Boolean(__ku?.responsePlan),
      exitKind: "single_exit_gate_json",
    });
  } catch {}

  return res.json(__tenmonGeneralGateResultMaybe(payload));
}

/**
 * FINAL_ANSWER_CONSTITUTION_AND_WISDOM_REDUCER_V1
 * 全route共通の最終一声還元（routeReason / contract は不変）。
 */
export function applyFinalAnswerConstitutionAndWisdomReducerV1(payload: any): any {
  const out = payload && typeof payload === "object" ? { ...payload } : payload;
  if (!out || typeof out !== "object") return payload;
  if (typeof out.response !== "string") return out;

  const df: any = out.decisionFrame && typeof out.decisionFrame === "object" ? out.decisionFrame : null;
  const ku: any = df && df.ku && typeof df.ku === "object" ? df.ku : null;
  if (!ku) return out;

  const responsePlan = ku.responsePlan && typeof ku.responsePlan === "object" ? ku.responsePlan : null;
  const centerContract =
    String(
      ku.centerLabel ||
      ku.threadCenterLabel ||
      ku.centerKey ||
      ku.threadCenterKey ||
      ""
    ).trim() || "この問い";
  const mission =
    String(ku.answerMode || ku.routeClass || "analysis").trim() || "analysis";
  const oneStepType =
    String(ku.answerFrame || responsePlan?.answerFrame || "one_step").trim() || "one_step";
  const lawsN = Array.isArray(ku.lawsUsed) ? ku.lawsUsed.length : 0;
  const eviN = Array.isArray(ku.evidenceIds) ? ku.evidenceIds.length : 0;
  const sourceHint = String(
    ku?.sourceStackSummary?.primaryMeaning ||
    ku?.sourceStackSummary?.responseAxis ||
    ""
  ).trim();
  const evidencePack = sourceHint || lawsN > 0 || eviN > 0
    ? `根拠束: ${sourceHint || "internal"}${lawsN > 0 ? ` law:${lawsN}` : ""}${eviN > 0 ? ` ev:${eviN}` : ""}`
    : "";

  let body = String(out.response || "").trim();
  body = body
    .replace(/^\s*（[^）]{0,36}）を土台に、いまの話を見ていきましょう。?\s*/u, "")
    .replace(/受け取っています。?そのまま続けてください。?/gu, "")
    .trim();

  const head = `【天聞の所見】${centerContract}について、今回は${mission}として答えます。`;
  const step =
    oneStepType === "statement_plus_one_question"
      ? "次の一手: 掘る軸を一つだけ選んでください。"
      : "次の一手: いまの中心を一つ保ったまま進めます。";
  const composed = [head, body, evidencePack, step].filter(Boolean).join("\n\n").trim();
  out.response = composed;
  return out;
}
