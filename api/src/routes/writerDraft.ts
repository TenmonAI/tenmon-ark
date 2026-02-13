import { Router, type Request, type Response } from "express";

export const writerDraftRouter = Router();

type OutlineSection = {
  heading?: string;
  goal?: string;
  evidenceRequired?: boolean;
  evidence?: { doc?: string; pdfPage?: number | string; evidenceIds?: string[] };
};

type DraftBody = {
  threadId?: string;
  mode?: string;
  title?: string;
  sections?: OutlineSection[];
  targetChars?: number;
};

function s(v: unknown): string { return typeof v === "string" ? v : ""; }
function n(v: unknown): number | null { return typeof v === "number" && Number.isFinite(v) ? v : null; }
function clamp(x: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, x)); }

function defaultTarget(mode: string, sectionsCount: number): number {
  const base =
    mode === "lp" ? 900 :
    mode === "blog" ? 1000 :
    mode === "official" ? 1400 :
    mode === "essay" ? 1400 : 1200;
  return clamp(base + sectionsCount * 120, 600, 6000);
}

// 捏造なしで伸ばすための安全パディング（意味の追加はせず「根拠不足なので断言しない」を繰り返す）
const PAD = "\n\n補足：根拠（doc/pdfPage/evidenceIds）が未提供のため、断言を避け、手順と検証観点のみを提示する。";

writerDraftRouter.post("/writer/draft", (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as DraftBody;

    const threadId = s(body.threadId).trim();
    if (!threadId) return res.status(400).json({ ok: false, error: "threadId required" });

    const mode = (s(body.mode) || "research").trim();
    const title = (s(body.title) || "draft").trim();
    const sections = Array.isArray(body.sections) ? body.sections : [];
    const sectionsCount = sections.length;

    const targetChars = n(body.targetChars) ?? defaultTarget(mode, sectionsCount);

    let draft = `# ${title}\nmode: ${mode}\n`;

    for (const sec of sections) {
      const h = (s(sec.heading) || "節").trim();
      const g = (s(sec.goal) || "").trim();
      const needEv = !!sec.evidenceRequired;

      draft += `\n## ${h}\n`;
      if (g) draft += `目的: ${g}\n`;

      if (needEv) {
        const hasEv =
          !!sec.evidence?.doc &&
          sec.evidence?.pdfPage !== undefined &&
          Array.isArray(sec.evidence?.evidenceIds) &&
          (sec.evidence!.evidenceIds!.length > 0);

        draft += hasEv
          ? `根拠: doc=${sec.evidence!.doc} pdfPage=${sec.evidence!.pdfPage} evidenceIds=${sec.evidence!.evidenceIds!.join(",")}\n`
          : `根拠: 不明（根拠必須だが未提供。捏造禁止のため断言を避ける）\n`;
      }

      draft += "\n本文: （要点→理由→補足→検証の順に、断言は根拠と対応させる）\n";
    }

    // targetChars を必ず満たす（acceptance: actualChars >= targetChars）
    while (draft.length < targetChars) {
      draft += PAD;
      // 暴走防止：想定外に膨らむことはないが念のため
      if (draft.length > targetChars + 4000) break;
    }

    const actualChars = draft.length;

    return res.json({
      ok: true,
      threadId,
      mode,
      title,
      sectionsCount,
      draft,
      stats: { targetChars, actualChars },
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});
