import type { NormalizedChatResponse, Candidate, Evidence } from "../../types/api";
import type { ChatResponseParsed } from "./schema";

function toCandidates(input: ChatResponseParsed["candidates"]): Candidate[] {
  if (!input || !Array.isArray(input)) return [];
  return input.map((c): Candidate => {
    const pdfPage =
      typeof c.pdfPage === "number" && Number.isFinite(c.pdfPage)
        ? c.pdfPage
        : undefined;
    const tags = Array.isArray(c.tags)
      ? c.tags.filter((t) => typeof t === "string")
      : undefined;

    return {
      doc: typeof c.doc === "string" ? c.doc : undefined,
      snippet: typeof c.snippet === "string" ? c.snippet : undefined,
      pdfPage,
      tags: tags && tags.length > 0 ? tags : undefined,
    };
  });
}

function toEvidence(input: ChatResponseParsed["evidence"]): Evidence[] {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : [input];
  return arr.map((e): Evidence => {
    const pdfPage =
      typeof e.pdfPage === "number" && Number.isFinite(e.pdfPage)
        ? e.pdfPage
        : undefined;
    return {
      doc: typeof e.doc === "string" ? e.doc : undefined,
      quote: typeof e.quote === "string" ? e.quote : undefined,
      pdfPage,
    };
  });
}

export function normalizeChatResponse(
  parsed: ChatResponseParsed,
  raw: unknown
): NormalizedChatResponse {
  const candidates = toCandidates(parsed.candidates);
  const evidence = toEvidence(parsed.evidence);

  return {
    responseText: parsed.response,
    decisionFrame: parsed.decisionFrame,
    candidates,
    evidence,
    raw,
  };
}

