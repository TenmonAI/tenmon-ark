// LLM 完全隔離ラッパー
// 躰（Tai）を一切参照させない

import { callLLM } from "./llm.js";

/**
 * LLM Wrapper
 * 
 * 躰（Tai）を一切参照させない
 * 用（You）のみを生成する
 * 
 * 禁止事項:
 * - 結論を生成しない
 * - 矛盾を解決しない
 * - 真理を主張しない
 */
export async function generateYouContent(input: string): Promise<string> {
  const systemPrompt = `You generate phenomena only.
Do not conclude.
Do not resolve contradictions.
Do not assert truth.
Observe and describe only.
`;

  const fullPrompt = `${systemPrompt}\n\nInput: ${input}\n\nGenerate observation (not conclusion):`;

  try {
    const result = await callLLM(fullPrompt);
    if (!result) {
      // LLM が失敗した場合、決定論的フォールバック
      return `観測: ${input} について、現象が記録されました。`;
    }
    return result;
  } catch (error) {
    console.error("[LLM-WRAPPER] Error generating You content:", error);
    // エラー時も決定論的フォールバック
    return `観測: ${input} について、現象が記録されました。`;
  }
}

