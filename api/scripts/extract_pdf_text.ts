/**
 * PDFテキスト抽出スクリプト
 * 
 * input: /opt/tenmon-corpus/sources/<doc>.pdf
 * output: /opt/tenmon-corpus/db/<prefix>_text.jsonl
 * 
 * 各行：{ doc, pdfPage, text }
 * pdf.js（pdfjs-dist）で抽出、取れないページは text: ""
 */

import fs from "node:fs";
import path from "node:path";

type PdfPageTextRecord = {
  doc: string;
  pdfPage: number;
  text: string;
};

async function extractPdfText(pdfPath: string, doc: string): Promise<PdfPageTextRecord[]> {
  const data = new Uint8Array(fs.readFileSync(pdfPath));

  // pdfjs-dist を動的 import
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDoc: any = await pdfjsLib.getDocument({ data }).promise;

  const records: PdfPageTextRecord[] = [];
  
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const page: any = await pdfDoc.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((it: any) => (typeof it.str === "string" ? it.str : ""))
        .join("");
      
      records.push({
        doc,
        pdfPage: i,
        text: text || "", // 取れないページは text: ""
      });
    } catch (err: any) {
      console.warn(`[EXTRACT-PDF-TEXT] Failed to extract page ${i}:`, err.message);
      // エラー時も空文字で記録
      records.push({
        doc,
        pdfPage: i,
        text: "",
      });
    }
  }

  return records;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error("Usage: node extract_pdf_text.js <doc_name>");
    console.error("Example: node extract_pdf_text.js khs");
    process.exit(1);
  }

  const prefix = args[0]; // khs, ktk, iroha
  const docMap: Record<string, string> = {
    khs: "言霊秘書.pdf",
    ktk: "カタカムナ言灵解.pdf",
    iroha: "いろは最終原稿.pdf",
  };

  const doc = docMap[prefix];
  if (!doc) {
    console.error(`Unknown prefix: ${prefix}. Use khs, ktk, or iroha.`);
    process.exit(1);
  }

  const sourcesDir = process.env.TENMON_CORPUS_SOURCES_DIR || "/opt/tenmon-corpus/sources";
  const dbDir = process.env.TENMON_CORPUS_DIR || "/opt/tenmon-corpus/db";
  
  const pdfPath = path.join(sourcesDir, doc);
  const outputPath = path.join(dbDir, `${prefix}_text.jsonl`);

  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF file not found: ${pdfPath}`);
    process.exit(1);
  }

  console.log(`[EXTRACT-PDF-TEXT] Extracting text from ${pdfPath}...`);
  const records = await extractPdfText(pdfPath, doc);
  
  console.log(`[EXTRACT-PDF-TEXT] Extracted ${records.length} pages`);

  // JSONL 形式で出力
  const output = records.map((r) => JSON.stringify(r)).join("\n");
  fs.writeFileSync(outputPath, output, "utf-8");
  
  console.log(`[EXTRACT-PDF-TEXT] Saved to ${outputPath}`);
  console.log(`[EXTRACT-PDF-TEXT] Done.`);
}

main().catch((err) => {
  console.error("[EXTRACT-PDF-TEXT] Error:", err);
  process.exit(1);
});


