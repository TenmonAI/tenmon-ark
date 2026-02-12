import { Router, type Request, type Response } from "express";

export const readerRouter = Router();

type OutlineChunk = {
  chunkId: string;
  sectionGuess: string;
  summary: string;
  keywords: string[];
  claims: string[];
  offsets: { start: number; end: number };
};

// 超簡易ストップワード（必要最小）
const STOP = new Set([
  "こと","これ","それ","ため","よう","もの","ところ","そして","また","しかし","なので","です","ます","する","いる","ある",
  "the","a","an","and","or","to","of","in","on","for","with","as","is","are",
]);

function pickKeywords(text: string, limit = 8): string[] {
  const norm = text
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .toLowerCase();
  const counts = new Map<string, number>();
  for (const raw of norm.split(/\s+/)) {
    const w = raw.trim();
    if (!w) continue;
    if (w.length <= 1) continue;
    if (STOP.has(w)) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

function splitChunks(text: string): { content: string; start: number; end: number }[] {
  // 見出しや空行で分割（過剰分割防止のため上限あり）
  const lines = text.split(/\r?\n/);
  const chunks: { content: string; start: number; end: number }[] = [];

  let buf: string[] = [];
  let start = 0;
  let cursor = 0;

  function flush(endPos: number) {
    const content = buf.join("\n").trim();
    if (content) chunks.push({ content, start, end: endPos });
    buf = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineWithNL = i === lines.length - 1 ? line : line + "\n";
    const isHeading = /^(\s*#|\s*\d+[\.\)]\s+|\s*【.+】|\s*第[一二三四五六七八九十0-9]+[章節項])/.test(line);
    const isBlank = line.trim() === "";

    // chunk切り替え条件：見出し or 空行が続く
    if ((isHeading && buf.length > 0) || (isBlank && buf.length > 0)) {
      flush(cursor);
      start = cursor + lineWithNL.length;
      cursor += lineWithNL.length;
      continue;
    }

    buf.push(line);
    cursor += lineWithNL.length;

    // 文字数上限で強制flush（巨大テキスト対策）
    if (buf.join("\n").length > 2400) {
      flush(cursor);
      start = cursor;
    }
  }
  flush(cursor);

  // chunk上限（暴走防止）
  return chunks.slice(0, 80);
}

function guessSection(content: string, idx: number): string {
  const first = content.split(/\r?\n/).map(s => s.trim()).find(Boolean) ?? "";
  if (/^#/.test(first)) return first.replace(/^#+\s*/, "").slice(0, 60);
  if (/^【.+】/.test(first)) return first.slice(0, 60);
  if (/^第[一二三四五六七八九十0-9]+/.test(first)) return first.slice(0, 60);
  return `SECTION_${idx + 1}`;
}

function extractClaims(content: string, limit = 6): string[] {
  // 日本語は「。」「！」などで粗く分割
  const parts = content
    .replace(/\r?\n/g, " ")
    .split(/(?<=[。！？!?\.\)])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  // 断定っぽい文を優先（簡易）
  const strong = parts.filter(s => /(?:である|だ|する|なる|示す|重要|必要)/.test(s));
  const picked = (strong.length ? strong : parts).slice(0, limit);
  return picked.map(s => s.slice(0, 180));
}

/**
 * POST /api/reader/outline
 * { threadId, text }
 */
readerRouter.post("/reader/outline", (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as any;
    const threadId = String(body.threadId ?? "").trim();
    const text = typeof body.text === "string" ? body.text : "";

    if (!threadId) return res.status(400).json({ ok: false, error: "threadId required" });
    if (!text.trim()) return res.status(400).json({ ok: false, error: "text required" });

    const chunksRaw = splitChunks(text);
    const chunks: OutlineChunk[] = chunksRaw.map((c, idx) => {
      const sectionGuess = guessSection(c.content, idx);
      const summary = c.content.replace(/\s+/g, " ").trim().slice(0, 200);
      const keywords = pickKeywords(c.content, 8);
      const claims = extractClaims(c.content, 6);
      return {
        chunkId: `${threadId}:${idx + 1}`,
        sectionGuess,
        summary,
        keywords,
        claims,
        offsets: { start: c.start, end: c.end },
      };
    });

    return res.json({
      ok: true,
      threadId,
      chunksCount: chunks.length,
      chunks,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

/**
 * POST /api/reader/analyze
 * Stateless analyzer (P0): detect inconsistencies / undefined terms / dependencies.
 * NOTE: first version is rule-based and may return empty arrays (still valid).
 */
readerRouter.post("/reader/analyze", (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as any;
    const threadId = String(body.threadId ?? "").trim();
    const text = typeof body.text === "string" ? body.text : "";

    if (!threadId) return res.status(400).json({ ok: false, error: "threadId required" });
    if (!text.trim()) return res.status(400).json({ ok: false, error: "text required" });

    // --- minimal deterministic heuristics ---
    const inconsistencies: string[] = [];
    const undefinedTerms: string[] = [];
    const dependencies: string[] = [];

    // naive contradiction cues
    const hasAlways = /必ず|絶対|常に/.test(text);
    const hasException = /ただし|例外|しかし/.test(text);
    if (hasAlways && hasException) inconsistencies.push("strong-claim-with-exception-cue");

    // undefined term cues: 「〇〇とは」未出 / っぽいもの（超軽量）
    const termDefs = [...text.matchAll(/([一-龥ぁ-んァ-ヶA-Za-z0-9_]{2,12})とは/g)].map((m) => m[1]);
    for (const t of termDefs) {
      // if term appears only once, definition likely incomplete
      const count = (text.match(new RegExp(t, "g")) ?? []).length;
      if (count <= 1) undefinedTerms.push(`${t} (defined-once)`);
    }

    // dependency cues: "AによりB" "AのためB"
    const depMatches = [...text.matchAll(/(.{1,20})(により|のため|によって)(.{1,20})/g)];
    for (const m of depMatches.slice(0, 10)) {
      dependencies.push(`${m[1].trim()} -> ${m[3].trim()}`);
    }

    return res.json({
      ok: true,
      threadId,
      inconsistencies,
      undefinedTerms,
      dependencies,
      inc: inconsistencies.length,
      undef: undefinedTerms.length,
      dep: dependencies.length,
      mode: "DET",
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});
