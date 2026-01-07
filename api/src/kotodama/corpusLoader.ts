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
 * 利用可能なドキュメント一覧を取得
 */
export function getAvailableDocs(): string[] {
  return Array.from(corpusCache.keys());
}

/**
 * 起動時に corpus をロード（初期化）
 * 3冊分（khs_pages.jsonl, ktk_pages.jsonl, iroha_pages.jsonl）をロード
 */
export function initCorpusLoader(): void {
  const corpusDir = process.env.TENMON_CORPUS_DIR || "/opt/tenmon-corpus/db";
  
  // 言霊秘書（KHS）
  const khsPath = path.join(corpusDir, "khs_pages.jsonl");
  const khsMap = loadJsonl(khsPath);
  corpusCache.set("言霊秘書.pdf", khsMap);
  
  // カタカムナ（KTK）
  const ktkPath = path.join(corpusDir, "ktk_pages.jsonl");
  const ktkMap = loadJsonl(ktkPath);
  corpusCache.set("カタカムナ言灵解.pdf", ktkMap);
  
  // いろは（IROHA）
  const irohaPath = path.join(corpusDir, "iroha_pages.jsonl");
  const irohaMap = loadJsonl(irohaPath);
  corpusCache.set("いろは最終原稿.pdf", irohaMap);
  
  const totalPages = khsMap.size + ktkMap.size + irohaMap.size;
  console.log(`[CORPUS-LOADER] Initialized: ${totalPages} pages cached across ${corpusCache.size} docs`);
  console.log(`[CORPUS-LOADER] Docs: ${Array.from(corpusCache.keys()).join(", ")}`);
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

