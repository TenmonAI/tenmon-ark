/**
 * ============================================================
 *  TEXT PROCESSOR — テキスト処理
 * ============================================================
 * 
 * テキストファイルを SemanticUnit に変換
 * ============================================================
 */

import { createSemanticUnit, type SemanticUnit } from "../db/schema/semanticUnit";
import type { KzFile } from "../db/schema/kzFile";

/**
 * テキストファイルを処理
 */
export async function processText(
  file: KzFile,
  chunkSize: number = 1000
): Promise<SemanticUnit[]> {
  const fs = require("fs");
  const path = require("path");
  
  const units: SemanticUnit[] = [];
  
  try {
    // ファイルコンテンツを読み込む
    const content = fs.readFileSync(file.path, "utf-8");
    const chunks = splitTextIntoChunks(content, chunkSize);
    
    // 各チャンクを SemanticUnit に変換
    for (const chunk of chunks) {
      const unit = createSemanticUnit({
        id: `unit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: chunk.text,
        metadata: {
          source: file.name,
          sourceId: file.id,
          position: chunk.position,
        },
      });
      units.push(unit);
    }
  } catch (error) {
    console.error(`Error processing text file ${file.path}:`, error);
  }
  
  return units;
}

/**
 * テキストをチャンクに分割
 */
function splitTextIntoChunks(
  text: string,
  chunkSize: number
): Array<{ text: string; position: { start: number; end: number } }> {
  const chunks: Array<{ text: string; position: { start: number; end: number } }> = [];
  
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push({
      text: text.slice(i, i + chunkSize),
      position: {
        start: i,
        end: Math.min(i + chunkSize, text.length),
      },
    });
  }
  
  return chunks;
}

export default {
  processText,
};

