// 水火分類器

import type { IkiState, Ruleset } from "../types.js";

/**
 * トークンを水火状態に分類
 */
export function classifyIki(
  tokens: string[],
  ruleset: Ruleset
): { state: IkiState; confidence: number; evidence: string[] } {
  const fireKeywords: string[] = [];
  const waterKeywords: string[] = [];
  const bothKeywords: string[] = [];
  
  // Rulesetからキーワードを抽出
  for (const rule of ruleset.rules) {
    if (rule.output.includes("FIRE") || rule.output.includes("火")) {
      fireKeywords.push(rule.pattern);
    } else if (rule.output.includes("WATER") || rule.output.includes("水")) {
      waterKeywords.push(rule.pattern);
    } else if (rule.output.includes("BOTH") || rule.output.includes("両")) {
      bothKeywords.push(rule.pattern);
    }
  }
  
  // トークンとキーワードを照合
  let fireCount = 0;
  let waterCount = 0;
  let bothCount = 0;
  const evidence: string[] = [];
  
  for (const token of tokens) {
    const lowerToken = token.toLowerCase();
    
    // FIRE キーワードチェック
    for (const keyword of fireKeywords) {
      if (lowerToken.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(lowerToken)) {
        fireCount++;
        evidence.push(`FIRE: ${token} matches ${keyword}`);
      }
    }
    
    // WATER キーワードチェック
    for (const keyword of waterKeywords) {
      if (lowerToken.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(lowerToken)) {
        waterCount++;
        evidence.push(`WATER: ${token} matches ${keyword}`);
      }
    }
    
    // BOTH キーワードチェック
    for (const keyword of bothKeywords) {
      if (lowerToken.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(lowerToken)) {
        bothCount++;
        evidence.push(`BOTH: ${token} matches ${keyword}`);
      }
    }
  }
  
  // フォールバック: ヒューリスティック
  if (fireCount === 0 && waterCount === 0 && bothCount === 0) {
    return classifyIkiHeuristic(tokens);
  }
  
  // 分類結果を決定
  if (bothCount > 0) {
    return { state: "BOTH", confidence: 0.8, evidence };
  } else if (fireCount > waterCount) {
    return { state: "FIRE", confidence: Math.min(0.9, 0.5 + fireCount * 0.1), evidence };
  } else if (waterCount > fireCount) {
    return { state: "WATER", confidence: Math.min(0.9, 0.5 + waterCount * 0.1), evidence };
  } else {
    return { state: "NEUTRAL", confidence: 0.5, evidence };
  }
}

/**
 * ヒューリスティックによる分類（フォールバック）
 */
function classifyIkiHeuristic(tokens: string[]): { state: IkiState; confidence: number; evidence: string[] } {
  const fireWords = ["火", "熱", "上", "昇", "開", "陽", "動", "積極"];
  const waterWords = ["水", "冷", "下", "降", "閉", "陰", "静", "消極"];
  
  let fireCount = 0;
  let waterCount = 0;
  const evidence: string[] = [];
  
  for (const token of tokens) {
    for (const word of fireWords) {
      if (token.includes(word)) {
        fireCount++;
        evidence.push(`FIRE (heuristic): ${token} contains ${word}`);
      }
    }
    for (const word of waterWords) {
      if (token.includes(word)) {
        waterCount++;
        evidence.push(`WATER (heuristic): ${token} contains ${word}`);
      }
    }
  }
  
  if (fireCount > waterCount) {
    return { state: "FIRE", confidence: 0.6, evidence };
  } else if (waterCount > fireCount) {
    return { state: "WATER", confidence: 0.6, evidence };
  } else {
    return { state: "NEUTRAL", confidence: 0.5, evidence: ["No clear classification"] };
  }
}

