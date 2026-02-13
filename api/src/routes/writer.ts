import { Router, type Request, type Response } from "express";

export const writerRouter = Router();

type Mode = "blog" | "research" | "official" | "lp" | "essay";
type OutlineSection = { heading: string; goal: string; evidenceRequired: boolean };

function s(v: unknown): string { return typeof v === "string" ? v : ""; }

function normalizeMode(v: unknown): Mode {
  const m = s(v).trim() as Mode;
  return (m === "blog" || m === "research" || m === "official" || m === "lp" || m === "essay")
    ? m
    : "research";
}

function buildSections(mode: Mode, topic: string, constraints: string[]): OutlineSection[] {
  const needEvidence =
    constraints.some((c) => c.includes("根拠")) ||
    mode === "research" ||
    mode === "official";

  if (mode === "lp") {
    return [
      { heading: "読者の課題", goal: `${topic} の課題を定義する`, evidenceRequired: false },
      { heading: "解決の要点", goal: `解決の要点（誇張せず）を整理する`, evidenceRequired: needEvidence },
      { heading: "根拠と事例", goal: `根拠（doc/pdfPage等）に基づき説明する`, evidenceRequired: true },
      { heading: "行動", goal: `次の一手を提示する`, evidenceRequired: false },
    ];
  }

  if (mode === "blog") {
    return [
      { heading: "導入", goal: `${topic} を短く導入する`, evidenceRequired: false },
      { heading: "要点", goal: `要点を整理する`, evidenceRequired: needEvidence },
      { heading: "補足", goal: `誤解されやすい点を補足する`, evidenceRequired: needEvidence },
      { heading: "まとめ", goal: `結論と次の一手をまとめる`, evidenceRequired: false },
    ];
  }

  // research / official / essay
  return [
    { heading: "問題設定", goal: "問いと範囲を明確化する", evidenceRequired: false },
    { heading: "先行整理", goal: "既知情報を構造化する", evidenceRequired: needEvidence },
    { heading: "解析", goal: "法則・矛盾・依存を抽出する", evidenceRequired: true },
    { heading: "結論", goal: "整合した結論を提示する", evidenceRequired: false },
  ];
}

/**
 * POST /api/writer/outline
 * body:
 *  - threadId: string (required)
 *  - mode: blog|research|official|lp|essay
 *  - topic?: string
 *  - text?: string   (backward compat)
 *  - title?: string  (backward compat)
 *  - constraints?: string[] | string
 */
writerRouter.post("/writer/outline", (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as any;

    const threadId = s(body.threadId).trim();
    if (!threadId) return res.status(400).json({ ok: false, error: "threadId required" });

    const mode = normalizeMode(body.mode);

    // backward compatible: topic OR text OR title
    const topic = (s(body.topic) || s(body.text) || s(body.title)).trim();
    if (!topic) return res.status(400).json({ ok: false, error: "topic required (topic/text/title)" });

    const constraintsRaw = body.constraints;
    const constraints =
      Array.isArray(constraintsRaw)
        ? constraintsRaw.map((x: any) => s(x)).filter(Boolean)
        : typeof constraintsRaw === "string"
          ? [constraintsRaw]
          : [];

    const title =
      mode === "research" ? "研究アウトライン" :
      mode === "official" ? "公式文書アウトライン" :
      mode === "lp" ? "LPアウトライン" :
      mode === "essay" ? "エッセイアウトライン" : "記事アウトライン";

    const sections = buildSections(mode, topic, constraints);
    const sectionsCount = sections.length;
    const evidenceReqCount = sections.filter((x) => x.evidenceRequired).length;

    // [W6-1] length budget (targetChars/targetWords)
    const targetChars = typeof body.targetChars === "number" ? body.targetChars
      : (typeof body.targetChars === "string" && body.targetChars.trim() ? Number(body.targetChars) : null);
    const targetWords = typeof body.targetWords === "number" ? body.targetWords
      : (typeof body.targetWords === "string" && body.targetWords.trim() ? Number(body.targetWords) : null);

    const totalUnits = Math.max(1, sectionsCount);
    const baseChars = (targetChars && Number.isFinite(targetChars) && targetChars > 0) ? Math.floor(targetChars / totalUnits) : null;
    const baseWords = (targetWords && Number.isFinite(targetWords) && targetWords > 0) ? Math.floor(targetWords / totalUnits) : null;

    const budgets = sections.map((s: any, idx: number) => ({
      idx,
      heading: s.heading ?? s.title ?? null,
      targetChars: baseChars,
      targetWords: baseWords,
      // evidenceRequired の節は後で加重配分したくなるが、今は最小diffで均等割り
      evidenceRequired: !!s.evidenceRequired,
    }));
    return res.json({
      ok: true,
      threadId,
      mode,
      title,
      sections,
      modeTag: "DET",
      sectionsCount,
      evidenceReqCount,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});
