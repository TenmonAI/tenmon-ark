import { Router, type Request, type Response } from "express";

type OutlineSection = {
  heading?: string;
  goal?: string;
  evidenceRequired?: boolean;
  evidence?: { doc?: string; pdfPage?: number | string };
};

type DraftBody = {
  threadId?: string;
  mode?: string;
  title?: string;
  sections?: OutlineSection[];
};

export const writerDraftRouter = Router();

/**
 * POST /api/writer/draft
 * Deterministic draft generation (no LLM).
 * Never invent facts. If evidenceRequired and missing evidence -> "不明".
 */
writerDraftRouter.post("/writer/draft", (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as DraftBody;
    const threadId = String(body.threadId ?? "").trim();
    if (!threadId) return res.status(400).json({ ok: false, error: "threadId required" });

    const mode = String(body.mode ?? "research").trim();
    const title = String(body.title ?? "下書き").trim();

    const sections = Array.isArray(body.sections) ? body.sections : [];
    if (sections.length === 0) return res.status(400).json({ ok: false, error: "sections required" });

    const lines: string[] = [];
    lines.push(`# ${title}`);
    lines.push(`mode: ${mode}`);
    lines.push("");

    for (const [i, s] of sections.entries()) {
      const heading = String(s?.heading ?? `セクション${i + 1}`).trim();
      const goal = String(s?.goal ?? "").trim();
      const evidenceRequired = Boolean(s?.evidenceRequired);

      const doc = s?.evidence?.doc ? String(s.evidence.doc).trim() : "";
      const pdfPageRaw = s?.evidence?.pdfPage;
      const pdfPage =
        typeof pdfPageRaw === "number"
          ? pdfPageRaw
          : typeof pdfPageRaw === "string" && pdfPageRaw.trim() !== ""
            ? Number(pdfPageRaw)
            : NaN;

      lines.push(`## ${heading}`);
      if (goal) lines.push(`目的: ${goal}`);
      lines.push("");

      if (evidenceRequired) {
        if (doc && Number.isFinite(pdfPage)) {
          lines.push(`根拠: doc=${doc} pdfPage=${pdfPage}`);
          lines.push(`本文: （根拠に沿って展開）`);
        } else {
          lines.push(`根拠: 不明（evidenceRequired=true）`);
          lines.push(`本文: 不明（根拠不足のため断定不可）`);
        }
      } else {
        lines.push(`本文: （要点→理由→補足の順に簡潔に記述）`);
      }
      lines.push("");
    }

    const draft = lines.join("\n").trimEnd();
    return res.json({ ok: true, threadId, mode, title, sectionsCount: sections.length, draft });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});
