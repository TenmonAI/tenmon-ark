// src/persona/responseFilter.ts
// response本文から禁止語句を削除するフィルタ

/**
 * response本文から禁止語句を削除
 * 
 * 禁止語句:
 * - #詳細
 * - pdfPage:
 * - lawId:
 * - 引用:
 */
export function filterResponseText(text: string): string {
  if (!text) return text;

  let filtered = text;

  // #詳細 を削除
  filtered = filtered.replace(/#詳細/gi, "");

  // pdfPage: で始まる行を削除
  filtered = filtered.replace(/pdfPage\s*:\s*\d+/gi, "");

  // lawId: で始まる行を削除
  filtered = filtered.replace(/lawId\s*:\s*[^\n]+/gi, "");

  // 引用: で始まる行を削除
  filtered = filtered.replace(/引用\s*:\s*[^\n]+/gi, "");

  // 連続する改行を整理
  filtered = filtered.replace(/\n{3,}/g, "\n\n");

  // 先頭・末尾の空白を削除
  filtered = filtered.trim();

  return filtered;
}


