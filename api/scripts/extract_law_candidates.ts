/**
 * 言霊秘書テキストから Law 候補（khs_law_candidates.jsonl）を抽出するスクリプト
 *
 * input : /opt/tenmon-corpus/db/khs_text.jsonl
 * output: /opt/tenmon-corpus/db/khs_law_candidates.jsonl
 */

import fs from "node:fs";
import path from "node:path";

type TextRecord = {
  doc: string;
  pdfPage: number;
  text: string;
};

type LawCandidate = {
  id: string;
  doc: string;
  pdfPage: number;
  title: string;
  quote: string;
  rule: string;
  confidence: number;
};

// 抽出ルール
const RULES: Array<{
  name: string;
  title: string;
  pattern: RegExp;
  confidence: number;
}> = [
  // ✅ TASK 1: 真理構造の核心語ヒット
  {
    name: "core-terms",
    title: "真理構造の核心語ヒット",
    // 水穂伝 / 火之巻 / 大八島 / 五十連 / 十行 / 言霊一言 / 一言之法則 / 重解誌 / 御中主 / 布斗麻邇 / 辞 / テニヲハ / 省 / 延開 / 反約
    pattern: /(水穂伝|火之巻|大八島|五十連|十行|言霊一言|一言之法則|重解誌|御中主|布斗麻邇|辞|テニヲハ|省|延開|反約)/g,
    confidence: 0.7,
  },
];

function loadTextRecords(filePath: string): TextRecord[] {
  if (!fs.existsSync(filePath)) {
    console.error(`[EXTRACT-LAW-CANDIDATES] text file not found: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  const out: TextRecord[] = [];

  for (const line of lines) {
    try {
      const rec = JSON.parse(line) as TextRecord;
      if (typeof rec.pdfPage === "number" && typeof rec.text === "string") {
        out.push(rec);
      }
    } catch (err: any) {
      console.warn(`[EXTRACT-LAW-CANDIDATES] failed to parse line: ${err.message}`);
    }
  }

  console.log(`[EXTRACT-LAW-CANDIDATES] loaded ${out.length} text records`);
  return out;
}

function makeSnippet(text: string, index: number, length = 40): string {
  const start = Math.max(0, index - length);
  const end = Math.min(text.length, index + length);
  return text.substring(start, end);
}

function extractCandidatesForPage(rec: TextRecord): LawCandidate[] {
  const out: LawCandidate[] = [];
  const { doc, pdfPage, text } = rec;

  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    let localIndex = 1;

    while ((m = rule.pattern.exec(text)) !== null) {
      const hit = m[1] ?? m[0];
      const idx = m.index;
      const snippet = makeSnippet(text, idx);
      const id = `KHS-CAND-P${String(pdfPage).padStart(4, "0")}-${rule.name.toUpperCase()}-${String(localIndex).padStart(3, "0")}`;

      out.push({
        id,
        doc,
        pdfPage,
        title: `${rule.title}：${hit}`,
        quote: snippet,
        rule: rule.name,
        confidence: rule.confidence,
      });

      localIndex += 1;
    }
  }

  return out;
}

async function main() {
  const corpusDir = process.env.TENMON_CORPUS_DIR || "/opt/tenmon-corpus/db";
  const textPath = path.join(corpusDir, "khs_text.jsonl");
  const outPath = path.join(corpusDir, "khs_law_candidates.jsonl");

  console.log(`[EXTRACT-LAW-CANDIDATES] input : ${textPath}`);
  console.log(`[EXTRACT-LAW-CANDIDATES] output: ${outPath}`);

  const pages = loadTextRecords(textPath).filter((r) => r.doc === "言霊秘書.pdf");
  const allCandidates: LawCandidate[] = [];

  for (const rec of pages) {
    const cands = extractCandidatesForPage(rec);
    if (cands.length > 0) {
      allCandidates.push(...cands);
    }
  }

  if (allCandidates.length === 0) {
    console.log("[EXTRACT-LAW-CANDIDATES] no candidates found");
  }

  const outLines = allCandidates.map((c) => JSON.stringify(c));
  fs.writeFileSync(outPath, outLines.join("\n"), "utf-8");

  console.log(`[EXTRACT-LAW-CANDIDATES] wrote ${allCandidates.length} candidates`);
}

main().catch((err) => {
  console.error("[EXTRACT-LAW-CANDIDATES] error:", err);
  process.exit(1);
});

