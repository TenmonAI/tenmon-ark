// S3_9_SYNTH_TAG_V1
// S3_SYNTH_TS_RESEAL_V1
// Deterministic synthesis for HYBRID candidates (no LLM). Safe + stable.

export type HybridCandidate = {
  doc?: string | null;
  pdfPage?: number | null;
  snippet?: string | null;
};

function isUsableSnippetV1(s: string): boolean {
  const t = String(s || "").trim();
  if (t.length < 80) return false;
  const jp = (t.match(/[\u3040-\u30ff\u4e00-\u9fff]/g) || []).length;
  return jp >= 10;
}

export function synthHybridResponseV1(args: {
  userMessage: string;
  baseResponse: string;
  candidates: HybridCandidate[];
}): { text: string; used: boolean } {
  const { baseResponse, candidates } = args;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { text: baseResponse, used: false };
  }

  // S3_SYNTH_PICK_FALLBACK_V2: pick first usable snippet, fallback to first candidate
  const top =
    candidates.find((c) => isUsableSnippetV1(String((c as any)?.snippet || ""))) ||
    candidates[0] ||
    ({} as any);

  const snip = String((top as any).snippet || "").trim();
  if (!snip) return { text: baseResponse, used: false };

  const doc = (top as any).doc ? String((top as any).doc) : null;
  const page = typeof (top as any).pdfPage === "number" ? (top as any).pdfPage : null;
  const cite = doc && page ? `（根拠: doc=${doc} pdfPage=${page}）\n` : "";
  const meta = `[SYNTH_USED doc=${doc ?? ''} pdfPage=${page ?? ''} snipLen=${snip.length}]\n`;

  return {
    text: meta + String(baseResponse || "").trim() + "\n\n" + cite + snip.slice(0, 800),
    used: true,
  };
}
