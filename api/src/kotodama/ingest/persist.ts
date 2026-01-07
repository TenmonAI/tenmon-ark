import crypto from "node:crypto";

import type { PdfPageText } from "../types.js";
import { normalizeText } from "./normalize.js";
import { detectLaws } from "./detectLaws.js";
import { upsertPage, insertDetectedLaw } from "../db.js";

function lawIdFor(page: number, index: number): string {
  // LawID 規約: KHS-Pxxxx-nnn
  const p = String(page).padStart(4, "0");
  const i = String(index).padStart(3, "0");
  return `KHS-P${p}-${i}`;
}

export async function persistPagesAndLaws(opts: {
  doc: string;
  pages: PdfPageText[];
}): Promise<void> {
  const { doc, pages } = opts;

  for (const page of pages) {
    const textRaw = page.text ?? "";
    const textNorm = normalizeText(textRaw);
    const hash = crypto.createHash("sha256").update(textNorm).digest("hex");

    upsertPage({
      doc,
      pdfPage: page.pdfPage,
      textRaw,
      textNorm,
      hash,
      bookPage: null,
      section: null,
    });

    // 法則抽出（まずは確実に拾えるものだけ）
    const detected = detectLaws(textNorm);
    detected.forEach((law, idx) => {
      const id = lawIdFor(page.pdfPage, idx + 1);
      insertDetectedLaw(doc, page.pdfPage, id, law);
    });
  }
}


