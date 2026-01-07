/**
 * PDFテキスト抽出結果（text.jsonl）をロード
 * 
 * /opt/tenmon-corpus/db/{khs,ktk,iroha}_text.jsonl を起動時にMapへロードしてキャッシュ
 */

import fs from "node:fs";
import path from "node:path";

export type PdfTextRecord = {
  doc: string;
  pdfPage: number;
  text: string;
};

// キャッシュ: Map<doc, Map<pdfPage, text>>
const textCache = new Map<string, Map<number, string>>();

/**
 * JSONL ファイルを読み込んで Map に格納
 */
function loadTextJsonl(filePath: string, doc: string): Map<number, string> {
  const map = new Map<number, string>();
  
  if (!fs.existsSync(filePath)) {
    console.warn(`[TEXT-LOADER] File not found: ${filePath}`);
    return map;
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim().length > 0);
    
    for (const line of lines) {
      try {
        const record = JSON.parse(line) as PdfTextRecord;
        if (record.doc === doc && record.pdfPage && typeof record.pdfPage === "number") {
          map.set(record.pdfPage, record.text || "");
        }
      } catch (err: any) {
        console.warn(`[TEXT-LOADER] Failed to parse line: ${err.message}`);
      }
    }
    
    console.log(`[TEXT-LOADER] Loaded ${map.size} pages from ${filePath}`);
  } catch (err: any) {
    console.error(`[TEXT-LOADER] Failed to load ${filePath}:`, err);
  }
  
  return map;
}

/**
 * 起動時に text.jsonl をロード（初期化）
 */
export function initTextLoader(): void {
  const corpusDir = process.env.TENMON_CORPUS_DIR || "/opt/tenmon-corpus/db";
  
  // 言霊秘書（KHS）
  const khsPath = path.join(corpusDir, "khs_text.jsonl");
  const khsMap = loadTextJsonl(khsPath, "言霊秘書.pdf");
  textCache.set("言霊秘書.pdf", khsMap);
  
  // カタカムナ（KTK）
  const ktkPath = path.join(corpusDir, "ktk_text.jsonl");
  const ktkMap = loadTextJsonl(ktkPath, "カタカムナ言灵解.pdf");
  textCache.set("カタカムナ言灵解.pdf", ktkMap);
  
  // いろは（IROHA）
  const irohaPath = path.join(corpusDir, "iroha_text.jsonl");
  const irohaMap = loadTextJsonl(irohaPath, "いろは最終原稿.pdf");
  textCache.set("いろは最終原稿.pdf", irohaMap);
  
  const totalPages = khsMap.size + ktkMap.size + irohaMap.size;
  console.log(`[TEXT-LOADER] Initialized: ${totalPages} pages cached across ${textCache.size} docs`);
}

/**
 * 指定ドキュメント・ページのテキストを取得
 */
export function getPageText(doc: string, pdfPage: number): string | null {
  const docMap = textCache.get(doc);
  if (!docMap) return null;
  
  return docMap.get(pdfPage) || null;
}

