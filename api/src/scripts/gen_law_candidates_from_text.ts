// src/scripts/gen_law_candidates_from_text.ts
// Phase 1: KTK/IROHA law_candidates 生成スクリプト
//
// 入力: *_text.jsonl（各行に doc/pdfPage/pageText 相当を含む）
// 出力: *_law_candidates.jsonl（各行JSON）

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const CORPUS_DIR = process.env.TENMON_CORPUS_DIR ?? "/opt/tenmon-corpus/db";

type LawCandidate = {
  id: string;
  doc: string;
  pdfPage: number;
  title: string;
  quote: string;
  rule: string;
  confidence: number;
};

type TextJsonlRecord = {
  doc?: string;
  pdfPage?: number | string;
  page?: number | string;
  p?: number | string;
  text?: string;
  body?: string;
  content?: string;
  pageText?: string;
  cleanedText?: string;
  rawText?: string;
  [key: string]: any;
};

const KEYWORDS = [
  "言灵", "言霊", "ことだま", "真言",
  "躰", "体", "用",
  "正中", "水火", "生成", "辞", "テニヲハ",
  "空仮中", "メシア",
  "カタカムナ", "天津金木", "布斗麻邇", "秘密荘厳心",
];

function pad4(n: number): string {
  return String(n).padStart(4, "0");
}

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

/**
 * テキストレコードからフィールド名を自動判別
 */
function detectFields(sample: TextJsonlRecord): {
  docKey: string;
  pageKey: string;
  textKey: string;
} {
  const docCandidates = ["doc"];
  const pageCandidates = ["pdfPage", "page", "p"];
  const textCandidates = ["text", "body", "content", "pageText", "cleanedText", "rawText"];

  let docKey = docCandidates.find(k => sample[k]) ?? docCandidates[0];
  let pageKey = pageCandidates.find(k => sample[k] !== undefined) ?? pageCandidates[0];
  let textKey = textCandidates.find(k => sample[k]) ?? textCandidates[0];

  return { docKey, pageKey, textKey };
}

/**
 * テキストから引用を抽出（キーワード周辺80〜200字）
 */
function extractQuotes(text: string, keywords: string[]): Array<{ keyword: string; quote: string; position: number }> {
  const quotes: Array<{ keyword: string; quote: string; position: number }> = [];
  const seen = new Set<string>(); // 重複防止

  for (const kw of keywords) {
    let index = 0;
    while (index < text.length) {
      const idx = text.indexOf(kw, index);
      if (idx < 0) break;

      // キーワード位置を中心に80〜200字を抽出
      const start = Math.max(0, idx - 40);
      const end = Math.min(text.length, idx + Math.max(80, Math.min(200, idx - start + 160)));
      const quote = text.slice(start, end).replace(/\s+/g, " ").trim();

      // 重複チェック（既に同じ内容があればスキップ）
      const key = `${kw}:${quote.slice(0, 50)}`;
      if (!seen.has(key) && quote.length >= 40) {
        quotes.push({ keyword: kw, quote, position: idx });
        seen.add(key);
      }

      index = idx + 1;
    }
  }

  return quotes;
}

/**
 * 単一のtext.jsonlファイルからlaw_candidates.jsonlを生成
 */
async function generateLawCandidates(
  inputFile: string,
  outputFile: string,
  docName: string,
  docPrefix: "KTK" | "IROHA"
): Promise<number> {
  if (!fs.existsSync(inputFile)) {
    throw new Error(`Input file not found: ${inputFile}`);
  }

  // 先頭数行を読んでフィールド名を判別
  const sampleLines: string[] = [];
  const sampleStream = fs.createReadStream(inputFile, "utf-8");
  const sampleRl = readline.createInterface({ input: sampleStream, crlfDelay: Infinity });

  for await (const line of sampleRl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const sample = JSON.parse(trimmed) as TextJsonlRecord;
      sampleLines.push(trimmed);
      if (sampleLines.length >= 3) break; // 3行で十分
    } catch {
      continue;
    }
  }
  sampleStream.close();

  if (sampleLines.length === 0) {
    throw new Error(`No valid JSON lines found in ${inputFile}`);
  }

  const firstRecord = JSON.parse(sampleLines[0]) as TextJsonlRecord;
  const { docKey, pageKey, textKey } = detectFields(firstRecord);

  // フィールドが必須
  if (!firstRecord[textKey]) {
    throw new Error(`Required field '${textKey}' not found in ${inputFile}. Available keys: ${Object.keys(firstRecord).join(", ")}`);
  }

  console.log(`[GEN-LAW-CANDIDATES] Detected fields: doc=${docKey}, page=${pageKey}, text=${textKey}`);

  // 全行を処理
  const candidates: LawCandidate[] = [];
  const stream = fs.createReadStream(inputFile, "utf-8");
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const record = JSON.parse(trimmed) as TextJsonlRecord;

      const doc = String(record[docKey] ?? docName);
      const pdfPage = Number(record[pageKey] ?? record[pageKey] ?? NaN);
      const text = String(record[textKey] ?? "");

      if (!Number.isFinite(pdfPage) || !text || text.length < 20) continue;
      if (doc !== docName) continue; // doc名が一致しない場合はスキップ

      // キーワードを含む引用を抽出
      const quotes = extractQuotes(text, KEYWORDS);

      // 各引用をlaw candidateとして生成
      for (let i = 0; i < quotes.length && candidates.length < 1000; i++) {
        const q = quotes[i];
        const p = pad4(pdfPage);
        const t = pad3(i + 1);

        candidates.push({
          id: `${docPrefix}-P${p}-T${t}`,
          doc: docName,
          pdfPage,
          title: q.keyword,
          quote: q.quote,
          rule: "fallback-from-text",
          confidence: 0.7, // 簡易抽出なので0.7
        });
      }
    } catch (e: any) {
      console.warn(`[GEN-LAW-CANDIDATES] Failed to parse line: ${e.message}`);
      continue;
    }
  }

  stream.close();

  // 出力ファイルに書き込み
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const lines = candidates.map(c => JSON.stringify(c));
  fs.writeFileSync(outputFile, lines.join("\n") + "\n", "utf-8");

  console.log(`[GEN-LAW-CANDIDATES] Generated ${candidates.length} candidates from ${inputFile} → ${outputFile}`);
  return candidates.length;
}

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);
  const docType = args[0] as "KTK" | "IROHA";

  if (!docType || (docType !== "KTK" && docType !== "IROHA")) {
    console.error("Usage: tsx gen_law_candidates_from_text.ts <KTK|IROHA>");
    process.exit(1);
  }

  const docName = docType === "KTK" ? "カタカムナ言灵解.pdf" : "いろは最終原稿.pdf";
  const textFile = docType === "KTK" ? "ktk_text.jsonl" : "iroha_text.jsonl";
  const lawFile = docType === "KTK" ? "ktk_law_candidates.jsonl" : "iroha_law_candidates.jsonl";

  const inputPath = path.join(CORPUS_DIR, textFile);
  const outputPath = path.join(CORPUS_DIR, lawFile);

  try {
    const count = await generateLawCandidates(inputPath, outputPath, docName, docType);
    console.log(`✅ Successfully generated ${count} law candidates for ${docType}`);
    process.exit(0);
  } catch (e: any) {
    console.error(`❌ Failed to generate law candidates: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

