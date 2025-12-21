// 推論器

import type { ReasoningTrace, Ruleset } from "../types.js";

/**
 * 推論を実行
 */
export function reason(
  input: string,
  trace: ReasoningTrace[],
  ruleset: Ruleset
): { interpretation: string; nextActions: string[]; evidence: string[] } {
  const evidence: string[] = [];
  
  // 現在の状態を取得
  const currentState = trace[trace.length - 1];
  if (!currentState) {
    return {
      interpretation: "状態が未確定です。",
      nextActions: [],
      evidence: [],
    };
  }
  
  // Rulesetから推論規則を抽出
  const reasoningRules = ruleset.rules.filter((rule) =>
    rule.output.includes("解釈") || rule.output.includes("行動") || rule.output.includes("提案")
  );
  
  // パターンマッチング
  let interpretation = "";
  const nextActions: string[] = [];
  
  for (const rule of reasoningRules) {
    const pattern = new RegExp(rule.pattern, "i");
    if (pattern.test(input) || pattern.test(currentState.input || "")) {
      if (rule.output.includes("解釈")) {
        interpretation = rule.output;
        evidence.push(`Interpretation: ${rule.name}`);
      } else if (rule.output.includes("行動") || rule.output.includes("提案")) {
        nextActions.push(rule.output);
        evidence.push(`Action: ${rule.name}`);
      }
    }
  }
  
  // フォールバック: デフォルト推論
  if (!interpretation) {
    interpretation = generateDefaultInterpretation(input, currentState);
  }
  
  if (nextActions.length === 0) {
    nextActions.push(...generateDefaultActions(currentState));
  }
  
  return { interpretation, nextActions, evidence };
}

/**
 * デフォルト解釈を生成
 */
function generateDefaultInterpretation(input: string, state: ReasoningTrace): string {
  const parts: string[] = [];
  
  if (state.state) {
    parts.push(`現在の状態: ${state.state}`);
  }
  
  parts.push(`入力: ${input}`);
  parts.push("この入力は、現在の状態に基づいて解釈されます。");
  
  return parts.join("\n");
}

/**
 * デフォルト行動を生成
 */
function generateDefaultActions(state: ReasoningTrace): string[] {
  const actions: string[] = [];
  
  if (state.stage === "kotodama") {
    actions.push("言靈を確認する");
    actions.push("次の位相を検討する");
  } else if (state.stage === "form") {
    actions.push("形を確認する");
    actions.push("言靈マッピングを実行する");
  } else {
    actions.push("状態を確認する");
    actions.push("次のステップを検討する");
  }
  
  return actions;
}

