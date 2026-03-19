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
