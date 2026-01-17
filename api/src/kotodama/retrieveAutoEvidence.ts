// src/kotodama/retrieveAutoEvidence.ts
import fs from "node:fs";
import path from "node:path";
import { getPageText } from "./textLoader.js";

export type AutoEvidenceHit = {
  doc: string;
  pdfPage: number;
  score: number;
  quoteSnippets: string[];
};

export type AutoEvidenceResult = {
  hits: AutoEvidenceHit[];
  confidence: number; // 0..1
};

const CORPUS_DIR = process.env.TENMON_CORPUS_DIR ?? "/opt/tenmon-corpus/db";

const DOCS = [
  { doc: "言霊秘書.pdf", file: "khs_pages.jsonl", weight: 1.2 },
  { doc: "カタカムナ言灵解.pdf", file: "ktk_pages.jsonl", weight: 1.0 },
  { doc: "いろは最終原稿.pdf", file: "iroha_pages.jsonl", weight: 1.1 },
] as const;

function keywordsFrom(message: string): string[] {
  const important = [
    "言灵","言霊","ことだま",
    "躰","体","用",
    "正中","水火","生成","辞","テニヲハ",
    "空仮中","メシア",
    "カタカムナ","天津金木","布斗麻邇","真言","秘密荘厳心",
  ];
  const hits = important.filter(k => message.includes(k));
  return Array.from(new Set(hits.length ? hits : ["言灵","言霊"]));
}

function snippetAround(text: string, kw: string, width=200): string | null {
  const idx = text.indexOf(kw);
  if (idx < 0) return null;
  const start = Math.max(0, idx - Math.floor(width / 2));
  const end = Math.min(text.length, start + width);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function scoreText(text: string, kws: string[]): { score: number; snippets: string[] } {
  let score = 0;
  const snippets: string[] = [];

  for (const kw of kws) {
    const count = (text.match(new RegExp(kw, "g")) ?? []).length;
    if (count > 0) {
      score += count * 10;
      const sn = snippetAround(text, kw, 200);
      if (sn) snippets.push(sn);
    }
  }

  // 軽い長さペナルティ
  score -= Math.max(0, Math.floor(text.length / 2000));

  return { score, snippets: snippets.slice(0, 3) };
}

export function retrieveAutoEvidence(message: string, topK=3): AutoEvidenceResult {
  const kws = keywordsFrom(message);
  const hits: AutoEvidenceHit[] = [];

  for (const d of DOCS) {
    const filePath = path.join(CORPUS_DIR, d.file);
    if (!fs.existsSync(filePath)) continue;

    const lines = fs.readFileSync(filePath, "utf-8").split("\n").filter(Boolean);
    let debugLogged = false; // デバッグログは1回だけ
    for (const line of lines) {
      let j: any;
      try { j = JSON.parse(line); } catch { continue; }

      // pdfPage を取得（pdfPage, page, pageNumber, p の揺れを許容）
      const pdfPage = Number(j.pdfPage ?? j.page ?? j.pageNumber ?? j.p ?? NaN);
      if (!Number.isFinite(pdfPage)) continue;

      // doc はファイル側の doc を優先（jsonlのdocが欠けても良い）
      const doc = d.doc;

      // 本文は textLoader を優先。空なら jsonlの候補キーを fallback
      const fromCache = getPageText(doc, pdfPage);
      const text = String(
        fromCache ??
        j.text ?? j.pageText ?? j.body ?? j.content ?? j.raw ?? j.value ?? j.t ?? ""
      ).trim();

      // デバッグ出力（1回だけ）
      if (process.env.DEBUG_AUTO_EVIDENCE === "1" && !text && j && !debugLogged) {
        console.debug(`[AUTO-EVIDENCE-DEBUG] ${d.file} pdfPage=${pdfPage} keys:`, Object.keys(j));
        debugLogged = true;
      }

      if (!text) continue;

      const { score, snippets } = scoreText(text, kws);
      if (score <= 0) continue;

      // weight を適用（文書ごとの重要度調整）
      const weightedScore = score * (d.weight ?? 1.0);

      hits.push({ doc, pdfPage, score: weightedScore, quoteSnippets: snippets });
    }
  }

  // 決定論ソート
  hits.sort((a,b) => (b.score - a.score) || a.doc.localeCompare(b.doc) || (a.pdfPage - b.pdfPage));

  const top = hits.slice(0, topK);
  const topScore = top[0]?.score ?? 0;
  const secondScore = top[1]?.score ?? 0;
  const confidence = topScore > 0 ? topScore / (topScore + secondScore + 1) : 0;

  return { hits: top, confidence };
}
