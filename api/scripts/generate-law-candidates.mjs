#!/usr/bin/env node
/**
 * KTK/IROHA law_candidates 生成スクリプト（KHSテンプレ複製方式）
 * 
 * Usage:
 *   node scripts/generate-law-candidates.mjs --doc ktk
 *   node scripts/generate-law-candidates.mjs --doc iroha
 * 
 * KHSテンプレート（khs_law_candidates.jsonlの先頭1行）を読み、同じkeys/構造で出力します。
 */

import fs from "node:fs";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CORPUS_DIR = process.env.TENMON_CORPUS_DIR ?? "/opt/tenmon-corpus/db";
const KHS_TEMPLATE_PATH = join(CORPUS_DIR, "khs_law_candidates.jsonl");

const DOC_MAP = {
  ktk: { docName: "カタカムナ言灵解.pdf", prefix: "KTK" },
  iroha: { docName: "いろは最終原稿.pdf", prefix: "IROHA" },
};

const KEYWORDS = [
  "言灵", "言霊", "ことだま", "真言",
  "躰", "体", "用",
  "正中", "水火", "生成", "辞", "テニヲハ",
  "空仮中", "メシア",
  "カタカムナ", "天津金木", "布斗麻邇", "秘密荘厳心",
];

function pad4(n) {
  return String(n).padStart(4, "0");
}

function pad3(n) {
  return String(n).padStart(3, "0");
}

function extractPdfPage(j) {
  const page = j.pdfPage ?? j.page ?? j.p ?? j.pageNumber;
  return typeof page === "number" ? page : (typeof page === "string" ? parseInt(page, 10) : null);
}

function extractText(j) {
  return String(j.text ?? j.pageText ?? j.body ?? j.content ?? j.raw ?? j.value ?? j.t ?? "").trim() || null;
}

function extractKeywords(text) {
  return Array.from(new Set(KEYWORDS.filter(k => text.includes(k))));
}

function generateQuotes(text, keywords) {
  const quotes = [];
  for (const kw of keywords) {
    const idx = text.indexOf(kw);
    if (idx >= 0) {
      const start = Math.max(0, idx - 80);
      const end = Math.min(text.length, idx + 120);
      const quote = text.slice(start, end).replace(/\s+/g, " ").trim();
      if (quote.length > 30) {
        quotes.push(quote);
      }
    }
  }
  // キーワードが見つからなければ、ページの冒頭を引用
  if (quotes.length === 0 && text.length > 50) {
    quotes.push(text.slice(0, 200).replace(/\s+/g, " ").trim());
  }
  return quotes;
}

// KHSテンプレートを読み込む（先頭1行）
function loadKHSTemplate() {
  if (!fs.existsSync(KHS_TEMPLATE_PATH)) {
    throw new Error(`KHS template not found: ${KHS_TEMPLATE_PATH}`);
  }
  
  const content = fs.readFileSync(KHS_TEMPLATE_PATH, "utf-8");
  const firstLine = content.split("\n").find(line => line.trim());
  
  if (!firstLine) {
    throw new Error(`KHS template is empty: ${KHS_TEMPLATE_PATH}`);
  }
  
  try {
    const template = JSON.parse(firstLine);
    return template;
  } catch (e) {
    throw new Error(`Failed to parse KHS template: ${e.message}`);
  }
}

async function generateLawCandidates(docType, inputPath, outputPath) {
  const { docName, prefix } = DOC_MAP[docType];
  if (!docName || !prefix) {
    throw new Error(`Invalid doc type: ${docType}. Must be 'ktk' or 'iroha'`);
  }

  // KHSテンプレートを読み込む
  const khsTemplate = loadKHSTemplate();
  const templateKeys = Object.keys(khsTemplate).sort();
  console.log(`📋 Loaded KHS template with keys: ${templateKeys.join(", ")}`);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const outputStream = fs.createWriteStream(outputPath, { encoding: "utf-8" });
  const rl = readline.createInterface({
    input: fs.createReadStream(inputPath, "utf-8"),
    crlfDelay: Infinity,
  });

  let candidateCount = 0;
  let pageCount = 0;
  const pageSet = new Set();
  const samples = [];

  for await (const line of rl) {
    const t = line.trim();
    if (!t) continue;

    let j;
    try {
      j = JSON.parse(t);
    } catch (e) {
      console.warn(`Skipping malformed JSON line: ${t.slice(0, 100)}... Error: ${e.message}`);
      continue;
    }

    const pageText = extractText(j);
    const pdfPage = extractPdfPage(j);
    const doc = String(j.doc ?? docName);

    if (!pageText || !pdfPage || !Number.isFinite(pdfPage)) {
      console.warn(`Skipping record due to missing text or pdfPage: doc=${doc}, pdfPage=${pdfPage}, text_len=${pageText?.length ?? 0}`);
      continue;
    }

    const keywords = extractKeywords(pageText);
    const quotes = generateQuotes(pageText, keywords);

    quotes.forEach((quote, idx) => {
      // KHSテンプレートの構造を複製
      const candidate = {
        id: `${prefix}-P${pad4(pdfPage)}-T${pad3(idx + 1)}`,
        doc: doc,
        pdfPage: pdfPage,
        title: keywords[idx] || `Page ${pdfPage} Snippet ${idx + 1}`,
        quote: quote,
        confidence: khsTemplate.confidence ?? 0.7,
        rule: khsTemplate.rule ?? "fallback-from-text",
      };
      
      // keys一致チェック
      const candidateKeys = Object.keys(candidate).sort();
      if (candidateKeys.join(",") !== templateKeys.join(",")) {
        throw new Error(`Keys mismatch! Template: ${templateKeys.join(",")}, Candidate: ${candidateKeys.join(",")}`);
      }
      
      outputStream.write(JSON.stringify(candidate) + "\n");
      candidateCount++;
      pageSet.add(pdfPage);
      if (samples.length < 3) {
        samples.push(candidate);
      }
    });
  }

  rl.close();
  outputStream.end();

  pageCount = pageSet.size;

  console.log(`✅ Generated ${candidateCount} law candidates for ${docName}`);
  console.log(`   - Input: ${inputPath}`);
  console.log(`   - Output: ${outputPath}`);
  console.log(`   - Pages: ${pageCount} unique pages`);
  console.log(`   - Candidates: ${candidateCount} total`);
  console.log(`   - Keys match: ${templateKeys.join(", ")}`);
  if (samples.length > 0) {
    console.log(`   - Samples (first 3):`);
    samples.forEach((s, i) => {
      console.log(`     ${i + 1}. ${s.id}: "${s.title}" (P${s.pdfPage})`);
    });
  }
}

// CLI引数処理
const args = process.argv.slice(2);
const docArg = args.find(a => a.startsWith("--doc="))?.split("=")[1] || args[args.indexOf("--doc") + 1];
const inArg = args.find(a => a.startsWith("--in="))?.split("=")[1] || args[args.indexOf("--in") + 1];
const outArg = args.find(a => a.startsWith("--out="))?.split("=")[1] || args[args.indexOf("--out") + 1];

if (!docArg || (docArg !== "ktk" && docArg !== "iroha")) {
  console.error("Usage: node scripts/generate-law-candidates.mjs --doc <ktk|iroha> [--in <input>] [--out <output>]");
  console.error("  --doc: Document type (ktk or iroha)");
  console.error("  --in: Input text.jsonl path (default: CORPUS_DIR/{ktk|iroha}_text.jsonl)");
  console.error("  --out: Output law_candidates.jsonl path (default: CORPUS_DIR/{ktk|iroha}_law_candidates.jsonl)");
  process.exit(1);
}

const inputPath = inArg || join(CORPUS_DIR, `${docArg}_text.jsonl`);
const outputPath = outArg || join(CORPUS_DIR, `${docArg}_law_candidates.jsonl`);

generateLawCandidates(docArg, inputPath, outputPath).catch((err) => {
  console.error(`❌ Error: ${err.message}`);
  process.exit(1);
});
