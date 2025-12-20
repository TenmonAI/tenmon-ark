// PHASE R-4b: Semantic Expansion Layer Engine

import type { PersonaState } from "../persona/personaState.js";
import type { ThinkingAxis } from "../persona/thinkingAxis.js";
import type { PersonaInertia } from "../persona/inertia.js";
import { getSemanticTemplate, expandTemplate } from "./templates.js";

/**
 * PHASE R-4b: 内部状態（CORE-6〜8の状態を保持）
 */
export type InternalState = {
  persona: PersonaState;
  thinkingAxis: ThinkingAxis;
  inertia: PersonaInertia | undefined;
  conversationCount: number;
};

/**
 * PHASE R-4b: 応答生成のコアエンジン
 * 
 * 思考軸（ThinkingAxis）とトーン（PersonaState.mode）に基づいて、
 * Semantic Templatesから最適な展開パターンを選択・結合し、
 * ユーザー入力を埋め込んで多段展開された応答を生成する。
 * 
 * @param input ユーザー入力
 * @param internalState 内部状態（CORE-6〜8の状態）
 * @returns 展開された応答テキスト
 */
export function generateResponse(
  input: string,
  internalState: InternalState
): string {
  const { persona, thinkingAxis, inertia, conversationCount } = internalState;
  
  // PHASE R-4b: 思考軸とトーンに基づいてテンプレートを取得
  const template = getSemanticTemplate(thinkingAxis, persona.mode);
  
  if (!template) {
    // フォールバック: テンプレートが見つからない場合は最小応答
    return `受け取りました。\n\n「${input}」`;
  }
  
  // PHASE R-4b: テンプレートパターンにユーザー入力を埋め込んで展開
  const expandedResponse = expandTemplate(template, input);
  
  // PHASE R-4b: 慣性（inertia）に基づく微調整
  // inertia.level が高い場合、応答の密度を上げる（改行を減らす）
  if (inertia && inertia.level > 0.5) {
    return expandedResponse.replace(/\n{3,}/g, "\n\n");
  }
  
  // PHASE R-4b: 会話回数に基づく微調整
  // 会話回数が多い場合、応答を簡潔にする（最初の2パターンのみ）
  if (conversationCount > 20 && template.patterns.length > 2) {
    const shortPatterns = template.patterns.slice(0, 2);
    return shortPatterns
      .map((pattern) => pattern.replace(/{input}/g, input))
      .join("\n\n");
  }
  
  return expandedResponse;
}

/**
 * PHASE R-4b: 内部状態を更新（CORE-6〜8の処理を統合）
 * 
 * 注意: この関数は既存のCORE-6〜8の処理を呼び出すためのラッパー。
 * 実際の状態更新は各モジュール（inertia.ts, thinkingAxis.ts等）で行われる。
 */
export function updateInternalState(
  currentState: InternalState,
  newPersona?: Partial<PersonaState>,
  newThinkingAxis?: ThinkingAxis,
  newInertia?: PersonaInertia | undefined
): InternalState {
  return {
    persona: newPersona ? { ...currentState.persona, ...newPersona } : currentState.persona,
    thinkingAxis: newThinkingAxis ?? currentState.thinkingAxis,
    inertia: newInertia ?? currentState.inertia,
    conversationCount: currentState.conversationCount + 1,
  };
}

