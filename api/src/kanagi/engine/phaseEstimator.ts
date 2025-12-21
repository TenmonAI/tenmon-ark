// 位相推定器

import type { Phase, Ruleset } from "../types.js";

/**
 * テキストから位相を推定
 */
export function estimatePhase(
  text: string,
  ruleset: Ruleset
): { phase: Phase; confidence: number; evidence: string[] } {
  const evidence: string[] = [];
  
  // Rulesetから位相関連の規則を抽出
  const phaseRules = ruleset.rules.filter((rule) =>
    rule.output.includes("rise") ||
    rule.output.includes("fall") ||
    rule.output.includes("open") ||
    rule.output.includes("close") ||
    rule.output.includes("center") ||
    rule.output.includes("昇") ||
    rule.output.includes("降") ||
    rule.output.includes("開") ||
    rule.output.includes("閉") ||
    rule.output.includes("中")
  );
  
  // パターンマッチング
  const phaseScores: Record<Phase, number> = {
    rise: 0,
    fall: 0,
    open: 0,
    close: 0,
    center: 0,
  };
  
  for (const rule of phaseRules) {
    const pattern = new RegExp(rule.pattern, "i");
    if (pattern.test(text)) {
      if (rule.output.includes("rise") || rule.output.includes("昇")) {
        phaseScores.rise++;
        evidence.push(`rise: ${rule.pattern} matched`);
      } else if (rule.output.includes("fall") || rule.output.includes("降")) {
        phaseScores.fall++;
        evidence.push(`fall: ${rule.pattern} matched`);
      } else if (rule.output.includes("open") || rule.output.includes("開")) {
        phaseScores.open++;
        evidence.push(`open: ${rule.pattern} matched`);
      } else if (rule.output.includes("close") || rule.output.includes("閉")) {
        phaseScores.close++;
        evidence.push(`close: ${rule.pattern} matched`);
      } else if (rule.output.includes("center") || rule.output.includes("中")) {
        phaseScores.center++;
        evidence.push(`center: ${rule.pattern} matched`);
      }
    }
  }
  
  // フォールバック: ヒューリスティック
  if (Object.values(phaseScores).every((score) => score === 0)) {
    return estimatePhaseHeuristic(text);
  }
  
  // 最もスコアの高い位相を選択
  const maxScore = Math.max(...Object.values(phaseScores));
  const phases = Object.entries(phaseScores)
    .filter(([, score]) => score === maxScore)
    .map(([phase]) => phase as Phase);
  
  const phase = phases[0] || "center";
  const confidence = Math.min(0.9, 0.5 + maxScore * 0.1);
  
  return { phase, confidence, evidence };
}

/**
 * ヒューリスティックによる位相推定（フォールバック）
 */
function estimatePhaseHeuristic(text: string): { phase: Phase; confidence: number; evidence: string[] } {
  const riseWords = ["昇", "上", "開", "始", "起"];
  const fallWords = ["降", "下", "閉", "終", "止"];
  const openWords = ["開", "放", "広", "明"];
  const closeWords = ["閉", "縮", "狭", "暗"];
  const centerWords = ["中", "央", "心", "核"];
  
  let riseCount = 0;
  let fallCount = 0;
  let openCount = 0;
  let closeCount = 0;
  let centerCount = 0;
  const evidence: string[] = [];
  
  for (const word of riseWords) {
    if (text.includes(word)) {
      riseCount++;
      evidence.push(`rise (heuristic): ${word}`);
    }
  }
  for (const word of fallWords) {
    if (text.includes(word)) {
      fallCount++;
      evidence.push(`fall (heuristic): ${word}`);
    }
  }
  for (const word of openWords) {
    if (text.includes(word)) {
      openCount++;
      evidence.push(`open (heuristic): ${word}`);
    }
  }
  for (const word of closeWords) {
    if (text.includes(word)) {
      closeCount++;
      evidence.push(`close (heuristic): ${word}`);
    }
  }
  for (const word of centerWords) {
    if (text.includes(word)) {
      centerCount++;
      evidence.push(`center (heuristic): ${word}`);
    }
  }
  
  const scores = {
    rise: riseCount,
    fall: fallCount,
    open: openCount,
    close: closeCount,
    center: centerCount,
  };
  
  const maxScore = Math.max(...Object.values(scores));
  const phases = Object.entries(scores)
    .filter(([, score]) => score === maxScore)
    .map(([phase]) => phase as Phase);
  
  const phase = phases[0] || "center";
  const confidence = maxScore > 0 ? 0.6 : 0.5;
  
  return { phase, confidence, evidence };
}

