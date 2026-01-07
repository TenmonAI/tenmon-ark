import fs from "node:fs";

import type { PdfPageText } from "../types.js";

/**
 * PDF を 1ページずつテキスト抽出する（最小実装）
 *
 * 抜けないページは text="" のままでも良い（後でOCR工程を差し替え可能）。
 * 実際の抽出には pdfjs-dist を使用する前提だが、ここでは動的 import にして
 * 依存が無い環境でも TypeScript ビルドが通るようにする。
 */
export async function extractPdfPages(pdfPath: string): Promise<PdfPageText[]> {
  const data = new Uint8Array(fs.readFileSync(pdfPath));

  // 実行環境で pdfjs-dist がインストールされていることを前提とした動的 import
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc: any = await pdfjsLib.getDocument({ data }).promise;

  const out: PdfPageText[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page: any = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((it: any) => (typeof it.str === "string" ? it.str : ""))
      .join("");
    out.push({ pdfPage: i, text });
  }
  return out;
}



