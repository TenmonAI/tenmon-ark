#!/usr/bin/env node
/**
 * kokuzo_pages / kokuzo_pages_fts の件数と FTS 検索の probe。
 * 実行前に api をビルドすること: npm run build
 * 使い方: node scripts/probe_kokuzo_fts.mjs [検索語...]
 * 検索語省略時は "言霊" で1件検索。
 */

import { getDb, dbPrepare } from "../dist/db/index.js";
import { searchKotodamaFts } from "../dist/kokuzo/search.js";

async function main() {
  const db = getDb("kokuzo");

  const pagesCount = dbPrepare("kokuzo", "SELECT COUNT(*) AS c FROM kokuzo_pages").get()?.c ?? 0;
  const ftsCount = dbPrepare("kokuzo", "SELECT COUNT(*) AS c FROM kokuzo_pages_fts").get()?.c ?? 0;
  const docs = dbPrepare("kokuzo", "SELECT doc, COUNT(*) AS pages FROM kokuzo_pages GROUP BY doc ORDER BY doc").all();

  console.log("[PROBE] kokuzo_pages count:", pagesCount);
  console.log("[PROBE] kokuzo_pages_fts count:", ftsCount);
  console.log("[PROBE] docs:", docs.length);
  docs.slice(0, 30).forEach((r) => console.log(`  ${r.doc}: ${r.pages} pages`));
  if (docs.length > 30) console.log(`  ... and ${docs.length - 30} more docs`);

  const terms = process.argv.slice(2).length ? process.argv.slice(2) : ["言霊"];
  for (const q of terms) {
    const hits = searchKotodamaFts(q, 3);
    console.log(`[FTS] query="${q}" -> ${hits.length} hits`);
    hits.forEach((h, i) => console.log(`  ${i + 1}. ${h.doc} p${h.pdfPage} ${(h.snippet || "").slice(0, 80)}...`));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
