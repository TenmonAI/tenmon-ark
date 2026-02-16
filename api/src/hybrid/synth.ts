export type HybridCandidate = {
  doc?: string | null;
  pdfPage?: number | null;
  snippet?: string | null;
};

export function synthHybridResponseV1(args: {
  userMessage: string;
  baseResponse: string;
  candidates: HybridCandidate[];
}): { text: string; used: boolean } {
  const { baseResponse, candidates } = args;
  if (!Array.isArray(candidates) || candidates.length === 0) return { text: baseResponse, used: false };

  // S3_SYNTH_PICK_FALLBACK_V1
  const top = (candidates.find((c) => (c?.snippet || "").trim().length > 0) || candidates[0] || {});
  const snip = (top.snippet || "").trim();
  if (!snip) return { text: baseResponse, used: false };

  const doc = top.doc ? String(top.doc) : null;
  const page = typeof top.pdfPage === "number" ? top.pdfPage : null;
  const cite = doc && page ? `（根拠: doc=${doc} pdfPage=${page}）\n` : "";

  return {
    text: String(baseResponse || "").trim() + "\n\n" + cite + snip.slice(0, 800),
    used: true,
  };
}
