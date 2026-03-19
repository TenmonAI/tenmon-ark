/**
 * CHAT_SAFE_REFACTOR_BASELINE_V1 — general 責務の切り出し先
 * P53: selectGroundingModeV1 を chat.ts から移管（CARD_GROUNDING_SELECTOR_V1）
 */

export type GroundingSelectorKind =
  | "grounded_required"
  | "scripture_canon"
  | "subconcept_canon"
  | "concept_canon"
  | "natural_general"
  | "unresolved";

/** CARD_GROUNDING_SELECTOR_V1: grounded / canon / concept / general / unresolved を1回だけ選択 */
export function selectGroundingModeV1(input: {
  rawMessage: string;
  wantsDetail: boolean;
  hasDocPage: boolean;
  isCmd: boolean;
  threadCenterType?: string | null;
  threadCenterKey?: string | null;
}): { kind: GroundingSelectorKind; reason: string; confidence: number } {
  const { rawMessage, wantsDetail, hasDocPage, isCmd, threadCenterType, threadCenterKey } = input;
  const raw = String(rawMessage ?? "").trim();
  if (hasDocPage || (wantsDetail && (/\bdoc\b/i.test(raw) || /pdfPage\s*=\s*\d+/i.test(raw)))) {
    return { kind: "grounded_required", reason: "doc/pdfPage_or_detail", confidence: 1 };
  }
  if (
    threadCenterType === "scripture" &&
    raw.length <= 80 &&
    (/さっき見ていた中心|(言霊|中心)(を)?土台に|今の話を(続ける|続けて|見ていきましょう)/u.test(raw) ||
      /^(次は|次の一手|違いは|どう違う|要するに|要点は)/u.test(raw) ||
      /^[ァ-ヴー]+\s*[は？?]?\s*$/u.test(raw))
  ) {
    return { kind: "scripture_canon", reason: "scripture_followup", confidence: 1 };
  }
  if (
    (!isCmd &&
      /(言霊|カタカムナ)(とは|って)(何|なに)(ですか)?\s*[？?]?$/u.test(raw)) ||
    (/(とは|って)(何|なに)(ですか)?\s*[？?]?$/u.test(raw) && /(言霊|カタカムナ|本質|核)/u.test(raw))
  ) {
    return { kind: "concept_canon", reason: "concept_definition", confidence: 0.9 };
  }
  if (wantsDetail && raw.length > 20) {
    return { kind: "unresolved", reason: "detail_context_strong", confidence: 0.6 };
  }
  return { kind: "natural_general", reason: "default", confidence: 0.5 };
}

/** P54: NATURAL_GENERAL_LLM_TOP 分流用の general kind（counsel / worldview / short_moral / other） */
export type GeneralKind = "counsel" | "worldview" | "short_moral" | "other";

/** CARD: generalKind 算出（本文・routeReason は変えない） */
export function getGeneralKind(message: string): GeneralKind {
  const t = String(message ?? "").trim();
  if (/悩み|しんどい|つらい|聞いてくれ|相談/.test(t)) return "counsel";
  if (/(なんで|なぜ|どうして).*(する|起きる)/.test(t)) return "worldview";
  if (/恨まない|許せない|許したい|責めたくない/.test(t)) return "short_moral";
  return "other";
}
