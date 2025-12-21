// 検証器

import type { IkiState, Phase, ReasoningTrace, Ruleset } from "../types.js";

/**
 * 矛盾を検証
 */
export function verify(
  trace: ReasoningTrace[],
  ruleset: Ruleset
): { warnings: string[]; contradictions: string[] } {
  const warnings: string[] = [];
  const contradictions: string[] = [];
  
  // 水火状態と位相の矛盾をチェック
  const ikiState = trace.find((t) => t.stage === "iki")?.state as IkiState | undefined;
  const phase = trace.find((t) => t.stage === "phase")?.state as Phase | undefined;
  
  if (ikiState && phase) {
    // FIRE が close-only と矛盾するかチェック
    if (ikiState === "FIRE" && phase === "close") {
      const warning = "FIRE状態がclose位相と矛盾する可能性があります。";
      warnings.push(warning);
      contradictions.push(warning);
    }
    
    // WATER が open-only と矛盾するかチェック
    if (ikiState === "WATER" && phase === "open") {
      const warning = "WATER状態がopen位相と矛盾する可能性があります。";
      warnings.push(warning);
      contradictions.push(warning);
    }
  }
  
  // Rulesetから検証規則を抽出
  const verificationRules = ruleset.laws.filter((law) =>
    law.condition.includes("矛盾") || law.condition.includes("検証")
  );
  
  // 検証規則を適用
  for (const law of verificationRules) {
    const condition = new RegExp(law.condition, "i");
    const traceText = trace.map((t) => t.input || t.output || String(t.state)).join(" ");
    
    if (condition.test(traceText)) {
      const warning = `検証規則違反: ${law.name} - ${law.result}`;
      warnings.push(warning);
      contradictions.push(warning);
    }
  }
  
  return { warnings, contradictions };
}

