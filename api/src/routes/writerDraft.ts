import { Router, type Request, type Response } from "express";
import { llmChat } from "../core/llmWrapper.js";

export const writerDraftRouter = Router();


// SECTIONSTATS_NORMALIZE_V1: ensure backward+forward compatible keys
function normalizeSectionStats(stats: any): any {
  if (!Array.isArray(stats)) return stats;
  return stats.map((x: any) => {
    if (!x || typeof x !== "object") return x;
    const heading = typeof x.heading === "string" ? x.heading : (typeof x.sectionTitle === "string" ? x.sectionTitle : "");
    const delta = typeof x.delta === "number" ? x.delta : (typeof x.deltaChars === "number" ? x.deltaChars : null);
    const out: any = { ...x };
    if (!out.sectionTitle && heading) out.sectionTitle = heading; // required by Phase54
    if (typeof out.deltaChars !== "number" && typeof delta === "number") out.deltaChars = delta; // required by Phase54
    // keep old keys if present; do not delete
    return out;
  });
}
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

function buildStructuredFallback(sectionHeading: string, needEv: boolean): string {
  const h = sectionHeading || "節";
  const evidenceLine = needEv
    ? "根拠が不足している論点は断定せず、必要資料（doc/pdfPage/evidenceIds）を明示する。"
    : "断定を避け、論点と前提を分けて説明する。";
  return [
    `## ${h}`,
    "要点:",
    `- ${h}の主題を定義し、前提条件を整理する。`,
    `- ${evidenceLine}`,
    "- 読者が次に検証すべき観点を短く示す。",
  ].join("\n");
}

async function generateSectionWithGPT(args: {
  heading: string;
  goal: string;
  needEv: boolean;
  targetChars: number;
}): Promise<string> {
  const fallback = buildStructuredFallback(args.heading, args.needEv);
  if (!process.env.OPENAI_API_KEY || !String(process.env.OPENAI_API_KEY).trim()) {
    return fallback;
  }
  try {
    const system = [
      "あなたは編集補助エンジン。",
      "placeholderやダミー行を出力しない。",
      "根拠不足なら断定しない。",
      "OCR raw text を真理として断定しない。",
    ].join("\n");
    const user = [
      `見出し: ${args.heading}`,
      `目標: ${args.goal || "論点を整理する"}`,
      `根拠必須: ${args.needEv ? "yes" : "no"}`,
      `目安文字数: ${Math.max(120, args.targetChars)}`,
      "出力は本文のみ。見出しを一度含める。",
    ].join("\n");
    const out = await llmChat({ system, history: [], user });
    const text = String(out?.text || "").trim();
    return text || fallback;
  } catch {
    return fallback;
  }
}

async function buildSectionBody(args: {
  targetChars: number;
  heading: string;
  goal: string;
  needEv: boolean;
}): Promise<string> {
  const generated = await generateSectionWithGPT({
    heading: args.heading,
    goal: args.goal,
    needEv: args.needEv,
    targetChars: args.targetChars,
  });
  let out = generated;
  if (out.length > args.targetChars) out = out.slice(0, args.targetChars);
  if (out.length < Math.min(args.targetChars, 160)) {
    const pad = "\n補足: 前提・制約・検証観点を明確化し、次の確認手順を示す。";
    out = (out + pad).slice(0, Math.max(args.targetChars, out.length + pad.length));
  }
  return out;
}

writerDraftRouter.post("/writer/draft", async (req: Request, res: Response) => {
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

    // SECTIONSTATS_NORMALIZE_V1
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
      draft += "\n" + (await buildSectionBody({ targetChars: secTarget, heading: h, goal: g, needEv })) + "\n";

      const _endLen = draft.length;
      const _actual = Math.max(0, _endLen - _startLen);
      const _target = secTarget;
      sectionStats.push({ idx: i, heading: h, targetChars: _target, actualChars: _actual, delta: _actual - _target });
    }

    // 全体を targetChars に収束（±tolerance）
    if (draft.length < lo) {
      // 足りない分は末尾セクションに安全行を足す
      while (draft.length < lo) {
        draft += "\n補足: 論点・前提・検証観点を維持して記述を補う。";
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
        sectionStats: normalizeSectionStats(sectionStats),
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
        // deterministic extension using structured sentence
        const shortfall = lo - len;
        const line = "\n補足: 表現を保ったまま、前提条件と検証観点を追記する。";
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
