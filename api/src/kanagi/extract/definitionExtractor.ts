// 定義抽出器

import type { Definition, Evidence } from "../types.js";

/**
 * テキストから定義を抽出
 * 
 * パターン:
 * - 「XとはYである」
 * - 「X: Y」
 * - 「X（Y）」
 */
export function extractDefinitions(
  text: string,
  source: string,
  pages: Array<{ page: number; text: string }>
): Definition[] {
  const definitions: Definition[] = [];
  const seen = new Set<string>();
  
  // パターン1: 「XとはYである」
  const pattern1 = /([^。\n]+)とは([^。\n]+)である/g;
  let match1;
  while ((match1 = pattern1.exec(text)) !== null) {
    const term = match1[1].trim();
    const meaning = match1[2].trim();
    
    if (term && meaning && !seen.has(term)) {
      seen.add(term);
      const evidence = findEvidence(term, source, pages);
      definitions.push({
        id: `def-${definitions.length + 1}`,
        term,
        meaning,
        evidence,
      });
    }
  }
  
  // パターン2: 「X: Y」
  const pattern2 = /([^：:\n]+)[：:]([^\n]+)/g;
  let match2;
  while ((match2 = pattern2.exec(text)) !== null) {
    const term = match2[1].trim();
    const meaning = match2[2].trim();
    
    if (term && meaning && term.length < 50 && !seen.has(term)) {
      seen.add(term);
      const evidence = findEvidence(term, source, pages);
      definitions.push({
        id: `def-${definitions.length + 1}`,
        term,
        meaning,
        evidence,
      });
    }
  }
  
  // パターン3: 「X（Y）」
  const pattern3 = /([^（(]+)[（(]([^）)]+)[）)]/g;
  let match3;
  while ((match3 = pattern3.exec(text)) !== null) {
    const term = match3[1].trim();
    const meaning = match3[2].trim();
    
    if (term && meaning && !seen.has(term)) {
      seen.add(term);
      const evidence = findEvidence(term, source, pages);
      definitions.push({
        id: `def-${definitions.length + 1}`,
        term,
        meaning,
        evidence,
      });
    }
  }
  
  return definitions;
}

/**
 * 証拠を検索
 */
function findEvidence(
  term: string,
  source: string,
  pages: Array<{ page: number; text: string }>
): Evidence[] {
  const evidence: Evidence[] = [];
  
  for (const page of pages) {
    const lines = page.text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(term)) {
        evidence.push({
          source,
          page: page.page,
          line: i + 1,
          snippet: lines[i].trim(),
        });
      }
    }
  }
  
  return evidence.length > 0 ? evidence : [{ source, snippet: term }];
}

