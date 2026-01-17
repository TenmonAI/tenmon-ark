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
  { doc: "言霊秘書.pdf", file: "khs_text.jsonl", weight: 1.2 },
  { doc: "カタカムナ言灵解.pdf", file: "ktk_text.jsonl", weight: 1.0 },
  { doc: "いろは最終原稿.pdf", file: "iroha_text.jsonl", weight: 1.1 },
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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function snippetAround(text: string, kw: string, width=200): string | null {
  const idx = text.indexOf(kw);
  if (idx < 0) return null;
  const start = Math.max(0, idx - Math.floor(width / 2));
  const end = Math.min(text.length, start + width);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function scoreText(text: string, kws: string[], weight: number = 1.0): { score: number; snippets: string[] } {
  let score = 0;
  const snippets: string[] = [];

  for (const kw of kws) {
    const escapedKw = escapeRegExp(kw);
    const count = (text.match(new RegExp(escapedKw, "g")) ?? []).length;
    if (count > 0) {
      score += count * 10;
      const sn = snippetAround(text, kw, 200);
      if (sn) snippets.push(sn);
    }
  }

  // 軽い長さペナルティ
  score -= Math.max(0, Math.floor(text.length / 2000));

  // weight を適用
  const weightedScore = score * weight;

  return { score: weightedScore, snippets: snippets.slice(0, 3) };
}

export function retrieveAutoEvidence(message: string, topK=3): AutoEvidenceResult {
  const kws = keywordsFrom(message);
  const hits: AutoEvidenceHit[] = [];
  let debugLogged = false; // デバッグログは1回だけ

  for (const d of DOCS) {
    const filePath = path.join(CORPUS_DIR, d.file);
    if (!fs.existsSync(filePath)) continue;

    const lines = fs.readFileSync(filePath, "utf-8").split("\n").filter(Boolean);
    for (const line of lines) {
      let j: any;
      try { j = JSON.parse(line); } catch { continue; }

      // pdfPage を取得（pdfPage, page, pageNumber, p の揺れを許容）
      const pdfPage = Number(j.pdfPage ?? j.page ?? j.pageNumber ?? j.p ?? NaN);
      if (!Number.isFinite(pdfPage)) continue;

      // doc はファイル側の doc を固定
      const doc = d.doc;

      // 本文は必ず getPageText のみを使用（jsonlのtextは使わない）
      const fromCache = getPageText(doc, pdfPage);
      const text = String(fromCache ?? "").trim();
      if (!text) continue;

      // scoreText に weight を渡してスコアリング
      const { score, snippets } = scoreText(text, kws, d.weight ?? 1.0);

      // デバッグ出力（pdfPage=6のとき、1回だけ）
      if (process.env.DEBUG_AUTO_EVIDENCE === "1" && pdfPage === 6 && !debugLogged) {
        console.debug(`[AUTO-EVIDENCE-DEBUG] pdfPage=6 score=${score} snippets=${snippets.length} text_len=${text.length}`);
        debugLogged = true;
      }

      if (score <= 0) continue;

      hits.push({ doc, pdfPage, score, quoteSnippets: snippets });
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
