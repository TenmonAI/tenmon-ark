import { Router, type Request, type Response } from "express";

export const writerVerifyRouter = Router();

type VerifyBody = {
  text?: unknown;
  draft?: unknown;
  content?: unknown;
  evidenceRequired?: unknown;
  evidencePolicy?: unknown; // "required" | "optional"
  evidenceIds?: unknown;
};

function s(v: unknown): string { return typeof v === "string" ? v : ""; }
function b(v: unknown): boolean | null { return typeof v === "boolean" ? v : null; }

writerVerifyRouter.post("/writer/verify", (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as VerifyBody;

    const text = (s(body.text) || s(body.draft) || s(body.content)).trim();
    if (!text) return res.status(400).json({ ok: false, error: "text required" });

    const evReq =
      b(body.evidenceRequired) ??
      (s(body.evidencePolicy).toLowerCase() === "required" ? true : null) ??
      false;

    const evidenceIds = Array.isArray(body.evidenceIds)
      ? body.evidenceIds.filter((x) => typeof x === "string")
      : [];

    const issues: { code: string; message: string }[] = [];

    const chars = text.length;
    if (chars < 40) issues.push({ code: "TOO_SHORT", message: "text too short" });

    if (evReq && evidenceIds.length === 0) {
      issues.push({ code: "MISSING_EVIDENCE", message: "evidence required but none provided" });
      if (/(必ず|絶対|断言|証明)/.test(text)) {
        issues.push({ code: "STRONG_CLAIM_WITHOUT_EVIDENCE", message: "strong claim without evidence" });
      }
    }

    return res.json({
      ok: true,
      issuesCount: issues.length,
      issues,
      codes: issues.map((i) => i.code),
      stats: {
        chars,
        evidenceNeeded: evReq,
        evidencePresent: evidenceIds.length > 0,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});
