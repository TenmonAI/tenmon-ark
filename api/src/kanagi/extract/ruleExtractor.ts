// 変換規則抽出器

import type { Rule, Evidence } from "../types.js";

/**
 * テキストから変換規則を抽出
 * 
 * パターン:
 * - 「X → Y」
 * - 「XはYに変換される」
 * - 「Xの場合、Y」
 */
export function extractRules(
  text: string,
  source: string,
  pages: Array<{ page: number; text: string }>
): Rule[] {
  const rules: Rule[] = [];
  const seen = new Set<string>();
  
  // パターン1: 「X → Y」
  const pattern1 = /([^→\n]+)→([^\n]+)/g;
  let match1;
  while ((match1 = pattern1.exec(text)) !== null) {
    const pattern = match1[1].trim();
    const output = match1[2].trim();
    
    if (pattern && output) {
      const key = `${pattern}→${output}`;
      if (!seen.has(key)) {
        seen.add(key);
        const evidence = findEvidence(pattern, source, pages);
        rules.push({
          id: `rule-${rules.length + 1}`,
          name: `変換規則: ${pattern} → ${output}`,
          pattern,
          output,
          evidence,
        });
      }
    }
  }
  
  // パターン2: 「XはYに変換される」
  const pattern2 = /([^は\n]+)は([^に\n]+)に変換される/g;
  let match2;
  while ((match2 = pattern2.exec(text)) !== null) {
    const pattern = match2[1].trim();
    const output = match2[2].trim();
    
    if (pattern && output) {
      const key = `${pattern}→${output}`;
      if (!seen.has(key)) {
        seen.add(key);
        const evidence = findEvidence(pattern, source, pages);
        rules.push({
          id: `rule-${rules.length + 1}`,
          name: `変換規則: ${pattern} → ${output}`,
          pattern,
          output,
          evidence,
        });
      }
    }
  }
  
  // パターン3: 「Xの場合、Y」
  const pattern3 = /([^の場合\n]+)の場合[、,]([^\n]+)/g;
  let match3;
  while ((match3 = pattern3.exec(text)) !== null) {
    const pattern = match3[1].trim();
    const output = match3[2].trim();
    
    if (pattern && output) {
      const key = `${pattern}→${output}`;
      if (!seen.has(key)) {
        seen.add(key);
        const evidence = findEvidence(pattern, source, pages);
        rules.push({
          id: `rule-${rules.length + 1}`,
          name: `条件規則: ${pattern} → ${output}`,
          pattern,
          output,
          evidence,
        });
      }
    }
  }
  
  return rules;
}

/**
 * 証拠を検索
 */
function findEvidence(
  pattern: string,
  source: string,
  pages: Array<{ page: number; text: string }>
): Evidence[] {
  const evidence: Evidence[] = [];
  
  for (const page of pages) {
    const lines = page.text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(pattern)) {
        evidence.push({
          source,
          page: page.page,
          line: i + 1,
          snippet: lines[i].trim(),
        });
      }
    }
  }
  
  return evidence.length > 0 ? evidence : [{ source, snippet: pattern }];
}

