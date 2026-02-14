import { Router, type Request, type Response } from "express";

export const writerDraftRouter = Router();

type OutlineSection = {
  heading?: string;
  goal?: string;
  evidenceRequired?: boolean;
  evidence?: { doc?: string; pdfPage?: number | string; evidenceIds?: string[] };
};

type Budget = {
  idx?: number;
  heading?: string | null;
  targetChars?: number | null;
  targetWords?: number | null;
  evidenceRequired?: boolean;
};

type DraftBody = {
  threadId?: string;
  mode?: string;
  title?: string;
  sections?: OutlineSection[];
  targetChars?: number;
  targetWords?: number;
  budgets?: Budget[];
  tolerancePct?: number; // optional: default 0.02 (±2%)
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

// 捏造なしで“量”を作る：意味は増やさず、検証観点と未確定を明記するテンプレ
function safeFillerLine(sectionHeading: string, needEv: boolean): string {
  const h = sectionHeading || "節";
  if (needEv) {
    return `- ${h}: 根拠が未提供のため断言せず、必要な根拠（doc/pdfPage/evidenceIds）の提示待ち。`;
  }
  return `- ${h}: 断言を避け、論点の整理と検証観点のみを提示。`;
}

// セクション本文を targetChars 近傍まで伸ばす（決定論）
function buildSectionBody(targetChars: number, heading: string, needEv: boolean): string {
  const intro = `本文:\n（要点→理由→補足→検証の順。根拠が無い断言はしない）\n`;
  let body = intro;
  // 先に10行程度入れてから、必要なら繰り返し
  for (let i = 0; i < 10; i++) body += safeFillerLine(heading, needEv) + "\n";
  while (body.length < targetChars) {
    body += safeFillerLine(heading, needEv) + "\n";
    if (body.length > targetChars + 2000) break; // 念のため
  }
  // ちょい超過は切る（文章を壊さないため、末尾のみ調整）
  if (body.length > targetChars) body = body.slice(0, targetChars);
  return body;
}

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
    const tolerancePct = clamp(n(body.tolerancePct) ?? 0.02, 0.0, 0.2);
    const lo = Math.floor(targetChars * (1 - tolerancePct));
    const hi = Math.ceil(targetChars * (1 + tolerancePct));

    const budgets = Array.isArray(body.budgets) ? body.budgets : [];

    // セクションごとの目標文字数を決定（budgets優先、なければ均等割）
    const perTargets: number[] = (() => {
      const nSec = Math.max(1, sectionsCount);
      const base = Math.floor(targetChars / nSec);
      const arr = new Array(nSec).fill(base);

      // budgets があれば idx/heading を基準に上書き
      for (let i = 0; i < nSec; i++) {
        const sec = sections[i] ?? {};
        const h = s(sec.heading).trim();
        const b =
          budgets.find(x => typeof x?.idx === "number" && x.idx === i) ??
          (h ? budgets.find(x => s(x?.heading).trim() === h) : undefined);

        const tc = b && typeof b.targetChars === "number" && Number.isFinite(b.targetChars) && b.targetChars > 0
          ? Math.floor(b.targetChars)
          : null;

        if (tc) arr[i] = tc;
      }

      // 合計を targetChars に合わせて最後で吸収
      const sum = arr.reduce((a, b) => a + b, 0);
      const diff = targetChars - sum;
      arr[nSec - 1] = Math.max(50, arr[nSec - 1] + diff);
      return arr;
    })();

    const sectionStats: { idx: number; heading: string; targetChars: number; actualChars: number; delta: number }[] = [];

let draft = `# ${title}\nmode: ${mode}\n`;

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i] ?? {};
      const h = (s(sec.heading) || "節").trim();
      const g = (s(sec.goal) || "").trim();
      const needEv = !!sec.evidenceRequired;

      const _startLen = draft.length;

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

      const secTarget = perTargets[i] ?? 200;
      draft += "\n" + buildSectionBody(secTarget, h, needEv) + "\n";

      const _endLen = draft.length;
      const _actual = Math.max(0, _endLen - _startLen);
      const _target = secTarget;
      sectionStats.push({ idx: i, heading: h, targetChars: _target, actualChars: _actual, delta: _actual - _target });
    }

    // 全体を targetChars に収束（±tolerance）
    if (draft.length < lo) {
      // 足りない分は末尾セクションに安全行を足す
      while (draft.length < lo) {
        draft += "\n" + safeFillerLine("調整", false);
        if (draft.length > hi + 4000) break;
      }
    } else if (draft.length > hi) {
      // 超過は末尾から切る（安全に末尾だけ）
      draft = draft.slice(0, hi);
    }

    const actualChars = draft.length;

    return res.json({
      ok: true,
      threadId,
      mode,
      title,
      sectionsCount,
      draft,
      stats: { targetChars, actualChars, tolerancePct, lo, hi },
      budgetsUsed: perTargets,
        sectionStats,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

// --- W6-4: refine loop (deterministic) ---
type RefineBody = {
  threadId?: string;
  draft?: string;
  targetChars?: number;
  tolerancePct?: number; // default 0.02
  maxRefineLoops?: number; // default 3
};

function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }

writerDraftRouter.post("/writer/refine", (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as RefineBody;

    const threadId = s(body.threadId).trim();
    if (!threadId) return res.status(400).json({ ok: false, error: "threadId required" });

    let draft = String((body as any)?.draft ?? "");
    if (!draft) return res.status(400).json({ ok: false, error: "draft required" });

    const targetChars = n(body.targetChars) ?? draft.length; // fallback: keep length
    const tolerancePct = clamp(n(body.tolerancePct) ?? 0.02, 0.0, 0.2);
    const lo = Math.floor(targetChars * (1 - tolerancePct));
    const hi = Math.ceil(targetChars * (1 + tolerancePct));
    const maxLoops = clamp(Math.floor(n(body.maxRefineLoops) ?? 3), 0, 8);

    const issuesBefore: string[] = [];
    const issuesAfter: string[] = [];
    const warnings: string[] = [];

    const beforeLen = draft.length;
    if (beforeLen < lo) issuesBefore.push("TOO_SHORT");
    if (beforeLen > hi) issuesBefore.push("TOO_LONG");
    if (beforeLen < lo || beforeLen > hi) issuesBefore.push("LENGTH_MISMATCH");

    let loops = 0;
    while (loops < maxLoops) {
      const len = draft.length;
      if (len >= lo && len <= hi) break;

      if (len < lo) {
        // add safe filler (deterministic): fill in one shot
        const shortfall = lo - len;
        const line = "\n" + safeFillerLine("refine", false);
        const per = Math.max(1, line.length);
        const needLines = Math.min(2000, Math.ceil(shortfall / per));
        draft += line.repeat(needLines);
      } else if (len > hi) {
        // trim from end only
        draft = draft.slice(0, hi);
      }
      loops++;
    }

    const afterLen = draft.length;
    const okLen = afterLen >= lo && afterLen <= hi;

    if (!okLen) warnings.push("NOT_CONVERGED");

    if (afterLen < lo) issuesAfter.push("TOO_SHORT");
    if (afterLen > hi) issuesAfter.push("TOO_LONG");
    if (!okLen) issuesAfter.push("LENGTH_MISMATCH");

    // simple lengthScore: 1 if within range, else decreases by normalized distance
    const dist = okLen ? 0 : Math.min(Math.abs(afterLen - lo), Math.abs(afterLen - hi));
    const lengthScore = okLen ? 1 : clamp01(1 - dist / Math.max(1, targetChars));

    return res.json({
      ok: true,
      schemaVersion: 1,
      threadId,
      refineLoopsUsed: loops,
      draft,
      stats: { targetChars, actualChars: afterLen, tolerancePct, lo, hi, lengthScore },
      issuesBefore,
      issuesAfter,
      warnings,
      modeTag: "DET",
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});
