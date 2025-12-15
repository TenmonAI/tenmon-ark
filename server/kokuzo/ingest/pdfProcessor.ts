/**
 * ============================================================
 *  PDF PROCESSOR — PDF処理
 * ============================================================
 * 
 * PDFファイルを SemanticUnit に変換
 * ============================================================
 */

import { createSemanticUnit, type SemanticUnit } from "../db/schema/semanticUnit";
import type { KzFile } from "../db/schema/kzFile";

/**
 * PDFファイルを処理
 */
export async function processPdf(
  file: KzFile,
  chunkSize: number = 1000
): Promise<SemanticUnit[]> {
  // PDF パーサーライブラリを使用（pdf-parse など）
  // 実際の実装では、pdf-parse をインストールして使用
  const units: SemanticUnit[] = [];
  
  try {
    // const pdfParse = require("pdf-parse");
    // const dataBuffer = fs.readFileSync(file.path);
    // const pdfData = await pdfParse(dataBuffer);
    // const pdfText = pdfData.text;
    // const chunks = splitTextIntoChunks(pdfText, chunkSize);
    
    // 各チャンクを SemanticUnit に変換
    // for (const chunk of chunks) {
    //   const unit = createSemanticUnit({
    //     id: `unit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    //     text: chunk.text,
    //     metadata: {
    //       source: file.name,
    //       sourceId: file.id,
    //       position: chunk.position,
    //     },
    //   });
    //   units.push(unit);
    // }
  } catch (error) {
    console.error(`Error processing PDF file ${file.path}:`, error);
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
  processPdf,
};

