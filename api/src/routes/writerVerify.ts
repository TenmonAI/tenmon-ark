import { Router, type Request, type Response } from "express";

export const writerVerifyRouter = Router();

type Section = { heading: string; goal?: string; evidenceRequired?: boolean };

function hasEvidenceHint(text: string): boolean {
  const t = text || "";
  return /(\bdoc=|\bpdfPage=|\bevidenceIds\b)/i.test(t);
}

function hasStrongClaim(text: string): boolean {
  const t = text || "";
  return /(絶対|必ず|唯一|確実|間違いない|断言する|100%)/.test(t);
}

writerVerifyRouter.post("/writer/verify", (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as any;
    const threadId = String(body.threadId ?? "").trim();
    const draft = typeof body.draft === "string" ? body.draft : "";
    const sections = Array.isArray(body.sections) ? (body.sections as Section[]) : [];

    if (!threadId) return res.status(400).json({ ok: false, error: "threadId required" });
    if (!draft.trim()) return res.status(400).json({ ok: false, error: "draft required" });

    const issues: Array<{ code: string; message: string }> = [];
    const chars = draft.length;

    if (chars < 200) {
      issues.push({ code: "TOO_SHORT", message: "本文が短すぎます（200文字未満）" });
    }

    const evidenceNeeded = sections.some((s) => s && s.evidenceRequired === true);
    const evidencePresent = hasEvidenceHint(draft);

    if (evidenceNeeded && !evidencePresent) {
      issues.push({
        code: "MISSING_EVIDENCE",
        message: "根拠必須セクションがあるのに、本文に根拠痕跡（doc/pdfPage/evidenceIds）がありません",
      });
    }

    if (hasStrongClaim(draft) && !evidencePresent) {
      issues.push({
        code: "STRONG_CLAIM_WITHOUT_EVIDENCE",
        message: "強い断言があるのに根拠痕跡（doc/pdfPage/evidenceIds）がありません",
      });
    }

    return res.json({
      ok: true,
      threadId,
      issues,
      stats: { chars, evidenceNeeded, evidencePresent },
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});
