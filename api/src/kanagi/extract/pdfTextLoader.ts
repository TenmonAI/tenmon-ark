// PDFテキストローダー

import fs from "fs/promises";

/**
 * PDFファイルからテキストを抽出
 * 
 * 注意: 本実装では簡易的にテキストファイルとして扱う
 * 実際のPDF処理には pdf-parse などのライブラリが必要
 */
export async function loadPdfText(filePath: string): Promise<{
  text: string;
  pages: Array<{ page: number; text: string }>;
}> {
  try {
    // 簡易実装: テキストファイルとして読み込む
    const content = await fs.readFile(filePath, "utf-8");
    
    // ページ区切りを仮定（空行2つ以上で区切る）
    const pages = content
      .split(/\n\s*\n\s*\n/)
      .map((text, index) => ({
        page: index + 1,
        text: text.trim(),
      }))
      .filter((page) => page.text.length > 0);
    
    return {
      text: content,
      pages: pages.length > 0 ? pages : [{ page: 1, text: content }],
    };
  } catch (error) {
    throw new Error(`Failed to load PDF text: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * アップロードされたファイルからテキストを抽出
 */
export async function loadUploadedText(file: File): Promise<{
  text: string;
  pages: Array<{ page: number; text: string }>;
}> {
  try {
    const buffer = await file.arrayBuffer();
    const content = Buffer.from(buffer).toString("utf-8");
    
    // ページ区切りを仮定
    const pages = content
      .split(/\n\s*\n\s*\n/)
      .map((text, index) => ({
        page: index + 1,
        text: text.trim(),
      }))
      .filter((page) => page.text.length > 0);
    
    return {
      text: content,
      pages: pages.length > 0 ? pages : [{ page: 1, text: content }],
    };
  } catch (error) {
    throw new Error(`Failed to load uploaded text: ${error instanceof Error ? error.message : String(error)}`);
  }
}

