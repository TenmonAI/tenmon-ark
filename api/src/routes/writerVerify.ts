import { Router, type Request, type Response } from "express";

export const writerVerifyRouter = Router();

type VerifyBody = {
  text?: unknown;
  draft?: unknown;
  content?: unknown;
  evidenceRequired?: unknown;
  evidencePolicy?: unknown; // "required" | "optional"
  evidenceIds?: unknown;

  // [W6-3]
  targetChars?: unknown;
  tolerancePct?: unknown; // optional, default 0.02 (±2%)
};

function s(v: unknown): string { return typeof v === "string" ? v : ""; }
function b(v: unknown): boolean | null { return typeof v === "boolean" ? v : null; }
function numOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function clamp(x: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, x)); }

writerVerifyRouter.post("/writer/verify", (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as VerifyBody;

    // text/message/input を統一（互換）
    const text = String((body as any)?.text ?? (body as any)?.message ?? (body as any)?.input ?? "");
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

    // [W6-3] length mismatch
    const targetCharsNum = numOrNull((body as any)?.targetChars);
    const targetChars = (targetCharsNum != null && targetCharsNum > 0) ? Math.floor(targetCharsNum) : null;

    const tolNum = numOrNull((body as any)?.tolerancePct);
    const tolerancePct = clamp((tolNum != null ? tolNum : 0.02), 0.0, 0.2);

    const lo = targetChars ? Math.floor(targetChars * (1 - tolerancePct)) : null;
    const hi = targetChars ? Math.ceil(targetChars * (1 + tolerancePct)) : null;

    const lengthMismatch = (targetChars && lo != null && hi != null) ? (chars < lo || chars > hi) : false;
    if (lengthMismatch) {
      issues.push({
        code: "LENGTH_MISMATCH",
        message: `length out of range: chars=${chars} target=${targetChars} tol=${tolerancePct} [${lo}-${hi}]`,
      });
    }

    if (evReq && evidenceIds.length === 0) {
      issues.push({ code: "MISSING_EVIDENCE", message: "evidence required but none provided" });
      if (/(必ず|絶対|断言|証明)/.test(text)) {
        issues.push({ code: "STRONG_CLAIM_WITHOUT_EVIDENCE", message: "strong claim without evidence" });
      }
    }

    return res.json({
      ok: true,
      schemaVersion: 1,
      issuesCount: issues.length,
      issues,
      codes: issues.map((i) => i.code),
      stats: {
        chars,
        evidenceNeeded: evReq,
        evidencePresent: evidenceIds.length > 0,
        targetChars: targetChars ?? null,
        tolerancePct,
        lo: lo ?? null,
        hi: hi ?? null,
        lengthMismatch,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});
