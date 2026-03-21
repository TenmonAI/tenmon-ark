/**
 * CHAT_SAFE_REFACTOR_BASELINE_V1 — define/scripture responsibility extraction.
 * P58: move minimal define fastpath detection/term extraction from chat.ts.
 */

/** Result of minimal define fastpath parse. */
export type DefineFastpathCandidate = {
  shouldHandle: boolean;
  term: string;
};

/**
 * DEF_FASTPATH_VERIFIED_V1 minimal front parsing.
 * Keeps existing route/contract behavior by only moving predicate + term extraction.
 */
export function parseDefineFastpathCandidate(normalizedMessage: string): DefineFastpathCandidate {
  const msg = String(normalizedMessage ?? "").trim();
  const isDefineQuestion =
    /とは\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(msg) ||
    /って\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(msg);
  const hasDocHint = /\bdoc\b/i.test(msg) || /pdfPage\s*=\s*\d+/i.test(msg) || /#詳細/.test(msg);
  const isCommand = msg.startsWith("#") || msg.startsWith("/");
  if (!(isDefineQuestion && !hasDocHint && !isCommand)) {
    return { shouldHandle: false, term: "" };
  }
  const term = msg
    .replace(/[?？]/g, "")
    .replace(/って\s*(何|なに)\s*(ですか)?$/u, "")
    .replace(/とは\s*(何|なに)\s*(ですか)?$/u, "")
    .replace(/とは$/u, "")
    .trim();
  return { shouldHandle: true, term };
}

type DefineHitLike = {
  lawKey?: unknown;
  unitId?: unknown;
  summary?: unknown;
  operator?: unknown;
  doc?: unknown;
  pdfPage?: unknown;
  quote?: unknown;
  quoteHash?: unknown;
} | null | undefined;

/** KOTODAMA_DEFINE_RENDERER_REPAIR_V1: 言霊 verified 本文の最低契約（本質・原理・次軸・180字以上）。先頭は「言霊とは、」で responseComposer の kotodama 置換を避ける */
const KOTODAMA_DEF_FASTPATH_SEMANTIC_V1 =
  "言霊とは、天地に鳴り響く五十連の音として立ち、水火を與み解いて詞の本を知る法則として作用する本質を持つものです。" +
  "\n\n" +
  "生成原理として、いろは配列では時間・秩序・成立の筋を読み、水火伝では生成と與合の相互作用を読み、五十連の音律へ戻して束ねます。" +
  "\n\n" +
  "次軸としては、法則の核・秩序の読み・水火の生成理解のどれを深めるかで答えの粒が変わります。次は、五十連・いろは秩序・水火生成のどこから詰めますか。";

/** P59: verified define fastpath の本文組み立て（routeReason/contract は触らない） */
export function buildDefineVerifiedFastpathBody(input: {
  term: string;
  summary: unknown;
  quote: unknown;
  doc: unknown;
  pdfPage: unknown;
}): { response: string; quoteHead: string } {
  let s: string;
  if (String(input.term ?? "").trim() === "言霊") {
    s = KOTODAMA_DEF_FASTPATH_SEMANTIC_V1;
  } else {
    s =
      String(input.summary ?? "").trim() ||
      "言霊とは、天地に鳴り響く五十連の音と、水火を與み解いて詞の本を知る法則です。";
  }
  const quoteHead = String(input.quote ?? "").replace(/\s+/g, " ").trim().slice(0, 180);
  const tailCommon =
    "\n\nまずは定義だけ押さえると、軸がぶれにくくなります。次は法則か背景のどちらを見るかで、理解の深さが変わります。";
  const response =
    "【天聞の所見】\n" +
    s +
    "\n\n" +
    "【根拠】" +
    quoteHead +
    `\n\n出典: ${String(input.doc ?? "")} P${Number(input.pdfPage ?? 0)}` +
    (String(input.term ?? "").trim() === "言霊" ? "" : tailCommon);
  return { response, quoteHead };
}

/** P59: verified define fastpath の law/evidence/lawTrace 組み立て */
export function buildDefineVerifiedEvidenceArtifacts(hitV: DefineHitLike, hitExplain: DefineHitLike): {
  lawsUsed: string[];
  evidenceIds: string[];
  lawTrace: Array<{ lawKey: string; unitId: string; op: string }>;
  khsLawsUsed: Array<{ lawKey: string; unitId: string; status: "verified"; operator: string }>;
} {
  const lawsUsed = [
    String((hitV as any)?.lawKey ?? ""),
    ...((hitExplain as any)?.lawKey ? [String((hitExplain as any).lawKey)] : []),
  ].filter(Boolean);
  const evidenceIds = [
    String((hitV as any)?.quoteHash ?? ""),
    ...((hitExplain as any)?.quoteHash ? [String((hitExplain as any).quoteHash)] : []),
  ].filter(Boolean);
  const lawTrace: Array<{ lawKey: string; unitId: string; op: string }> = [
    {
      lawKey: String((hitV as any)?.lawKey ?? ""),
      unitId: String((hitV as any)?.unitId ?? ""),
      op: "OP_DEFINE",
    },
    ...((hitExplain as any)?.lawKey
      ? [
          {
            lawKey: String((hitExplain as any).lawKey),
            unitId: String((hitExplain as any).unitId ?? ""),
            op: "OP_EXPLAINS",
          },
        ]
      : []),
  ].filter((x) => Boolean(x.lawKey));
  const khsLawsUsed: Array<{ lawKey: string; unitId: string; status: "verified"; operator: string }> = [
    {
      lawKey: String((hitV as any)?.lawKey ?? ""),
      unitId: String((hitV as any)?.unitId ?? ""),
      status: "verified" as const,
      operator: String((hitV as any)?.operator ?? "OP_DEFINE"),
    },
    ...((hitExplain as any)?.lawKey
      ? [
          {
            lawKey: String((hitExplain as any).lawKey),
            unitId: String((hitExplain as any).unitId ?? ""),
            status: "verified" as const,
            operator: String((hitExplain as any).operator ?? "OP_EXPLAINS"),
          },
        ]
      : []),
  ].filter((x) => Boolean(x.lawKey));
  return { lawsUsed, evidenceIds, lawTrace, khsLawsUsed };
}

/** P59: define系 responsePlan 用の入力を純粋関数化 */
export function buildDefineResponsePlanInput(input: {
  routeReason: string;
  rawMessage: string;
  centerKey: string | null;
  centerLabel: string | null;
  scriptureKey: string | null;
  semanticBody: string;
}) {
  return {
    routeReason: String(input.routeReason || "DEF_FASTPATH_VERIFIED_V1"),
    rawMessage: String(input.rawMessage ?? ""),
    centerKey: input.centerKey ?? null,
    centerLabel: input.centerLabel ?? null,
    scriptureKey: input.scriptureKey ?? null,
    semanticBody: String(input.semanticBody ?? ""),
    mode: "general" as const,
    responseKind: "statement_plus_question" as const,
  };
}

/** P60: proposed define fastpath の本文組み立て（routeReason/contract は触らない） */
export function buildDefineProposedFastpathBody(input: {
  summary: unknown;
  quote: unknown;
  doc: unknown;
  pdfPage: unknown;
}): { response: string; quoteHead: string } {
  const quote = String(input.quote ?? "").trim();
  const response =
    "【天聞の所見】\n" +
    (String(input.summary ?? "").trim() || quote.slice(0, 220)) +
    `\n\n出典: ${String(input.doc ?? "")} P${Number(input.pdfPage ?? 0)}` +
    "\n\nこの定義候補を、さらに verified 根拠に寄せて深めますか？";
  return { response, quoteHead: quote.slice(0, 120) };
}

/** P60: proposed define fastpath の law/evidence/lawTrace 組み立て */
export function buildDefineProposedEvidenceArtifacts(hitP: DefineHitLike): {
  lawsUsed: string[];
  evidenceIds: string[];
  lawTrace: Array<{ lawKey: string; unitId: string; op: string }>;
} {
  const lawsUsed = [String((hitP as any)?.lawKey ?? "")].filter(Boolean);
  const evidenceIds = [String((hitP as any)?.quoteHash ?? "")].filter(Boolean);
  const lawTrace = [
    {
      lawKey: String((hitP as any)?.lawKey ?? ""),
      unitId: String((hitP as any)?.unitId ?? ""),
      op: "OP_DEFINE",
    },
  ].filter((x) => Boolean(x.lawKey));
  return { lawsUsed, evidenceIds, lawTrace };
}

/** P62: scripture preempt のコア書籍判定（boundary 判定の pure 化） */
export function isCoreScriptureBookPreemptMessage(message: string): boolean {
  const msg = String(message ?? "").trim();
  return /(法華経|言霊秘書|いろは言[霊灵靈]解|イロハ言[霊灵靈]解|カタカムナ言[霊灵靈]解|水穂伝)/u.test(msg);
}

/** P62: scripture gate へ入るかどうかの境界条件（route/contract には触れない） */
export function shouldEnterScriptureBoundaryGate(input: {
  isTestTid: boolean;
  hasDoc: boolean;
  askedMenu: boolean;
  isCmd: boolean;
  scripturePreemptHit: unknown;
  isScriptureDef: boolean;
  isDefinitionQ: boolean;
  scriptureCenterKey: string | null;
}): boolean {
  if (input.isTestTid) return false;
  if (input.hasDoc || input.askedMenu || input.isCmd) return false;
  return Boolean(
    input.scripturePreemptHit || input.isScriptureDef || input.isDefinitionQ || input.scriptureCenterKey
  );
}
