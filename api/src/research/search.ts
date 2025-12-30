import { promises as fs } from "node:fs";
import path from "node:path";
import { RESEARCH_DIR } from "./paths.js";
import type { PagesManifest } from "./pages.js";

export type SearchHit = {
  page: number;
  score: number;
  snippet: string;
};

function norm(s: string) {
  return s.replace(/\r\n/g, "\n");
}

function makeSnippet(text: string, q: string): string {
  const t = norm(text);
  const i = t.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return t.slice(0, 260).trim();
  const start = Math.max(0, i - 120);
  const end = Math.min(t.length, i + 260);
  return t.slice(start, end).replace(/\s+/g, " ").trim();
}

export async function searchInPages(args: { id: string; query: string; manifest: PagesManifest; limit?: number }) {
  const { id, query, manifest, limit = 12 } = args;
  const q = query.trim();
  if (!q) return [];

  const hits: SearchHit[] = [];

  const textsDir = path.join(RESEARCH_DIR, "pages", id, "text");

  for (const p of manifest.pages) {
    const tp = path.join(textsDir, `p${String(p.page).padStart(4, "0")}.txt`);
    let text = "";
    try {
      text = await fs.readFile(tp, "utf-8");
    } catch {
      continue;
    }

    const low = text.toLowerCase();
    const count = low.split(q.toLowerCase()).length - 1;
    if (count <= 0) continue;

    hits.push({
      page: p.page,
      score: Math.min(999, count * 10 + Math.min(50, text.length / 1000)),
      snippet: makeSnippet(text, q),
    });
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

