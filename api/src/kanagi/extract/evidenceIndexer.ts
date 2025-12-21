// 証拠インデクサー

import type { Evidence } from "../types.js";

/**
 * 証拠をインデックス化
 */
export function indexEvidence(
  evidence: Evidence[],
  _text: string,
  source: string,
  pages: Array<{ page: number; text: string }>
): Evidence[] {
  const indexed: Evidence[] = [];
  
  for (const ev of evidence) {
    // ページ番号と行番号が未設定の場合、検索して設定
    if (!ev.page || !ev.line) {
      const found = findEvidenceLocation(ev.snippet, source, pages);
      if (found) {
        indexed.push({
          ...ev,
          page: found.page,
          line: found.line,
          snippet: found.snippet,
        });
      } else {
        indexed.push(ev);
      }
    } else {
      indexed.push(ev);
    }
  }
  
  return indexed;
}

/**
 * 証拠の位置を検索
 */
function findEvidenceLocation(
  snippet: string,
  _source: string,
  pages: Array<{ page: number; text: string }>
): { page: number; line: number; snippet: string } | null {
  for (const page of pages) {
    const lines = page.text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(snippet) || snippet.includes(lines[i].trim())) {
        return {
          page: page.page,
          line: i + 1,
          snippet: lines[i].trim(),
        };
      }
    }
  }
  
  return null;
}

