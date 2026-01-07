/**
 * Corpus JSONL ローダー
 * 
 * /opt/tenmon-corpus/db/khs_pages.jsonl を起動時にMapへロードしてキャッシュ
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type CorpusPageRecord = {
  doc: string;
  pdfPage: number;
  bookPage?: string;
  rawText: string;
  cleanedText: string;
  hasImages: boolean;
  imagePath?: string;
  notes?: string;
};

// キャッシュ: Map<doc, Map<pdfPage, CorpusPageRecord>>
const corpusCache = new Map<string, Map<number, CorpusPageRecord>>();

/**
 * JSONL ファイルを読み込んで Map に格納
 */
function loadJsonl(filePath: string): Map<number, CorpusPageRecord> {
  const map = new Map<number, CorpusPageRecord>();
  
  if (!fs.existsSync(filePath)) {
    console.warn(`[CORPUS-LOADER] File not found: ${filePath}`);
    return map;
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim().length > 0);
    
    for (const line of lines) {
      try {
        const record = JSON.parse(line) as CorpusPageRecord;
        if (record.pdfPage && typeof record.pdfPage === "number") {
          map.set(record.pdfPage, record);
        }
      } catch (err: any) {
        console.warn(`[CORPUS-LOADER] Failed to parse line: ${err.message}`);
      }
    }
    
    console.log(`[CORPUS-LOADER] Loaded ${map.size} pages from ${filePath}`);
  } catch (err: any) {
    console.error(`[CORPUS-LOADER] Failed to load ${filePath}:`, err);
  }
  
  return map;
}

/**
 * 起動時に corpus をロード（初期化）
 */
export function initCorpusLoader(): void {
  const corpusDir = process.env.TENMON_CORPUS_DIR || "/opt/tenmon-corpus/db";
  const jsonlPath = path.join(corpusDir, "khs_pages.jsonl");
  
  const map = loadJsonl(jsonlPath);
  corpusCache.set("言霊秘書.pdf", map);
  
  console.log(`[CORPUS-LOADER] Initialized: ${map.size} pages cached`);
}

/**
 * 指定ドキュメント・ページのレコードを取得
 */
export function getCorpusPage(
  doc: string,
  pdfPage: number
): CorpusPageRecord | null {
  const docMap = corpusCache.get(doc);
  if (!docMap) return null;
  
  return docMap.get(pdfPage) || null;
}

/**
 * 指定ドキュメントの全ページを取得（範囲指定可）
 */
export function getCorpusPages(
  doc: string,
  from?: number,
  to?: number
): CorpusPageRecord[] {
  const docMap = corpusCache.get(doc);
  if (!docMap) return [];
  
  const pages: CorpusPageRecord[] = [];
  const start = from || 1;
  const end = to || Math.max(...Array.from(docMap.keys()));
  
  for (let i = start; i <= end; i++) {
    const record = docMap.get(i);
    if (record) {
      pages.push(record);
    }
  }
  
  return pages;
}

