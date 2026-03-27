/**
 * TENMON_KNOWLEDGE_TO_STYLE_BRIDGE_V1
 * understandingReductionV1 を表面整形 hint へ橋渡し（本文捏造なし・meta 文字列は本文に出さない）。
 */

/** 表面に出す一行から内部ラベルを落とす（本文捏造はしない） */
function stripMetaLeakFromHint(s: string): string {
  return String(s || "")
    .replace(/\s*\(pri:[^)]*\)/giu, "")
    .replace(/\s*\(pri:[^)]*$/giu, "")
    .replace(/\btier:[^\s]+/giu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function splitSemanticLines(semanticBody: string): string[] {
  return String(semanticBody || "")
    .trim()
    .split(/\n+/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** inferNextAxisLineV1 と独立（循環 import 回避） */
function inferSecondSemanticLine(semanticBody: string, centerClaimHint: string): string {
  const lines = splitSemanticLines(semanticBody);
  const c = centerClaimHint.replace(/\s+/gu, " ").trim().slice(0, 40);
  if (lines.length >= 2) {
    if (c && lines[0].includes(c.slice(0, Math.min(6, c.length)))) {
      return lines[1].slice(0, 240);
    }
    return lines[1].slice(0, 240);
  }
  return "";
}

export type KnowledgeStyleBridgeHintsV1 = {
  centerClaimHint: string;
  nextAxisHint?: string;
};

/**
 * route family ごとに内部理解を hint へ写像（routeReason / ku は変更しない）。
 */
export function buildKnowledgeSurfaceBridgeHintsV1(
  ku: Record<string, unknown>,
  routeReason: string,
  semanticBody: string,
): KnowledgeStyleBridgeHintsV1 {
  const rr = String(routeReason || "").trim();
  const tcs = ku.thoughtCoreSummary as Record<string, unknown> | undefined;
  const ur = (tcs?.understandingReductionV1 || null) as Record<string, unknown> | null;
  const claim = String(ur?.centerClaim ?? "").replace(/\s+/gu, " ").trim();
  const meaning = String(ur?.centerMeaning ?? "").replace(/\s+/gu, " ").trim();
  const axis = String(ur?.understandingAxis ?? "").trim();

  let centerClaimHint = "";
  if (claim.length >= 6) centerClaimHint = stripMetaLeakFromHint(claim).slice(0, 240);
  else if (meaning.length >= 6) centerClaimHint = stripMetaLeakFromHint(meaning).slice(0, 240);

  let nextAxisHint: string | undefined;

  const scriptureLike =
    /^(K1_TRACE_EMPTY_GATED_V1|SCRIPTURE_LOCAL_RESOLVER_V4|TENMON_SCRIPTURE_CANON_V1|TRUTH_GATE_RETURN_V2)$/u.test(rr);
  const selfawareLike = /^R22_SELFAWARE_/u.test(rr) || rr === "WILL_CORE_PREEMPT_V1";
  const continuityLike = rr === "CONTINUITY_ROUTE_HOLD_V1";
  const generalLike = /^(NATURAL_GENERAL_LLM_TOP|GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1)$/u.test(rr);

  if (scriptureLike) {
    const na = inferSecondSemanticLine(semanticBody, centerClaimHint);
    if (na.length >= 8 && na !== centerClaimHint.slice(0, 240)) nextAxisHint = na;
  } else if (selfawareLike) {
    const na = inferSecondSemanticLine(semanticBody, centerClaimHint);
    if (na.length >= 8 && na !== centerClaimHint.slice(0, 240)) nextAxisHint = na;
  } else if (continuityLike) {
    /* 質問は surface 契約側で抑制。次軸は付けない */
    nextAxisHint = undefined;
  } else if (generalLike) {
    const na = inferSecondSemanticLine(semanticBody, centerClaimHint);
    if (na.length >= 8 && na !== centerClaimHint.slice(0, 240)) nextAxisHint = na;
  } else if (/^DEF_/u.test(rr) || axis === "kotodama_define") {
    const na = inferSecondSemanticLine(semanticBody, centerClaimHint);
    if (na.length >= 8 && na !== centerClaimHint.slice(0, 240)) nextAxisHint = na;
  }

  return { centerClaimHint: centerClaimHint || "", nextAxisHint };
}
