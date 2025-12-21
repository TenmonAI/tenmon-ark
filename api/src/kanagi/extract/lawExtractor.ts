// 体系規則抽出器

import type { Law, Evidence } from "../types.js";

/**
 * テキストから体系規則を抽出
 * 
 * パターン:
 * - 「XならばY」
 * - 「Xのとき、Y」
 * - 「Xである場合、Yである」
 */
export function extractLaws(
  text: string,
  source: string,
  pages: Array<{ page: number; text: string }>
): Law[] {
  const laws: Law[] = [];
  const seen = new Set<string>();
  
  // パターン1: 「XならばY」
  const pattern1 = /([^ならば\n]+)ならば([^\n]+)/g;
  let match1;
  while ((match1 = pattern1.exec(text)) !== null) {
    const condition = match1[1].trim();
    const result = match1[2].trim();
    
    if (condition && result) {
      const key = `${condition}→${result}`;
      if (!seen.has(key)) {
        seen.add(key);
        const evidence = findEvidence(condition, source, pages);
        laws.push({
          id: `law-${laws.length + 1}`,
          name: `体系規則: ${condition} → ${result}`,
          condition,
          result,
          evidence,
        });
      }
    }
  }
  
  // パターン2: 「Xのとき、Y」
  const pattern2 = /([^のとき\n]+)のとき[、,]([^\n]+)/g;
  let match2;
  while ((match2 = pattern2.exec(text)) !== null) {
    const condition = match2[1].trim();
    const result = match2[2].trim();
    
    if (condition && result) {
      const key = `${condition}→${result}`;
      if (!seen.has(key)) {
        seen.add(key);
        const evidence = findEvidence(condition, source, pages);
        laws.push({
          id: `law-${laws.length + 1}`,
          name: `体系規則: ${condition} → ${result}`,
          condition,
          result,
          evidence,
        });
      }
    }
  }
  
  // パターン3: 「Xである場合、Yである」
  const pattern3 = /([^である場合\n]+)である場合[、,]([^\n]+)/g;
  let match3;
  while ((match3 = pattern3.exec(text)) !== null) {
    const condition = match3[1].trim();
    const result = match3[2].trim();
    
    if (condition && result) {
      const key = `${condition}→${result}`;
      if (!seen.has(key)) {
        seen.add(key);
        const evidence = findEvidence(condition, source, pages);
        laws.push({
          id: `law-${laws.length + 1}`,
          name: `体系規則: ${condition} → ${result}`,
          condition,
          result,
          evidence,
        });
      }
    }
  }
  
  return laws;
}

/**
 * 証拠を検索
 */
function findEvidence(
  condition: string,
  source: string,
  pages: Array<{ page: number; text: string }>
): Evidence[] {
  const evidence: Evidence[] = [];
  
  for (const page of pages) {
    const lines = page.text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(condition)) {
        evidence.push({
          source,
          page: page.page,
          line: i + 1,
          snippet: lines[i].trim(),
        });
      }
    }
  }
  
  return evidence.length > 0 ? evidence : [{ source, snippet: condition }];
}

