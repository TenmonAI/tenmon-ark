#!/usr/bin/env node
/**
 * Kotodama Ingest CLI
 *
 * 使い方（例）:
 *   node dist/kotodama/ingest/run.js /path/to/言霊秘書.pdf
 *
 * 入力: PDFパス
 * 出力: kokuzo.sqlite 内の kotodama_pages / kotodama_laws を更新
 */

import path from "node:path";
import { extractPdfPages } from "./extractPdfPages.js";
import { persistPagesAndLaws } from "./persist.js";

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error("Usage: node run.js /path/to/言霊秘書.pdf");
    process.exit(1);
  }

  const absPath = path.resolve(process.cwd(), pdfPath);
  console.log(`[KOTODAMA] ingest start: ${absPath}`);

  const pages = await extractPdfPages(absPath);
  console.log(`[KOTODAMA] extracted pages: ${pages.length}`);

  await persistPagesAndLaws({
    doc: path.basename(absPath),
    pages,
  });

  console.log("[KOTODAMA] ingest done");
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();



