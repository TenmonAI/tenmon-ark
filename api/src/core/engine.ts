// PHASE R-4b: Semantic Expansion Layer Engine
// PHASE R-5: Short-Term Memory (STM) 統合

import type { PersonaState } from "../persona/personaState.js";
import type { ThinkingAxis } from "../persona/thinkingAxis.js";
import type { PersonaInertia } from "../persona/inertia.js";
import type { ConversationTurn } from "../persona/memory.js";
import { getSemanticTemplate, expandTemplate } from "./templates.js";
import { addConversationTurn } from "../persona/memory.js";
import { transitionAxis } from "../persona/thinkingAxis.js";

/**
 * PHASE R-4b + R-5: 内部状態（CORE-6〜8の状態 + 短期記憶を保持）
 */
export type InternalState = {
  persona: PersonaState;
  thinkingAxis: ThinkingAxis;
  inertia: PersonaInertia | undefined;
  conversationCount: number;
  // PHASE R-5: 短期記憶（直近5ラリー = 10メッセージを保持）
  conversationHistory: ConversationTurn[];
};

/**
 * PHASE R-4b + R-5: 応答生成のコアエンジン
 * 
 * 思考軸（ThinkingAxis）とトーン（PersonaState.mode）に基づいて、
 * Semantic Templatesから最適な展開パターンを選択・結合し、
 * ユーザー入力を埋め込んで多段展開された応答を生成する。
 * 
 * PHASE R-5: 会話履歴を考慮した応答生成（将来のLLM統合に向けた準備）
 * 
 * @param input ユーザー入力
 * @param internalState 内部状態（CORE-6〜8の状態 + 短期記憶）
 * @returns 展開された応答テキスト
 */
export function generateResponse(
  input: string,
  internalState: InternalState
): string {
  const { persona, thinkingAxis, inertia, conversationCount } = internalState;
  
  // PHASE R-5: 会話履歴は internalState.conversationHistory に保持されている
  // （PHASE R-7でLLM統合時に活用予定）
  
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
 * PHASE R-4b + R-5: 内部状態を更新（CORE-6〜8の処理 + 短期記憶を統合）
 * 
 * 注意: この関数は既存のCORE-6〜8の処理を呼び出すためのラッパー。
 * 実際の状態更新は各モジュール（inertia.ts, thinkingAxis.ts等）で行われる。
 * 
 * PHASE R-5: 会話履歴を自動的に更新する（ユーザー入力とアシスタント応答を追加）
 * 
 * Amatsu-Kanagi (天津金木) 状態遷移エンジン:
 * - 前の思考軸を尊重し、入力に基づいて決定論的に遷移
 * - デフォルトは同じ軸に留まる
 * - 明示的な遷移トリガーのみで軸を変更
 * 
 * @param currentState 現在の内部状態
 * @param userInput ユーザー入力（会話履歴に追加、軸遷移の判定に使用）
 * @param assistantResponse アシスタント応答（会話履歴に追加）
 * @param newPersona 新しい人格状態（オプション）
 * @param newInertia 新しい慣性（オプション）
 * @returns 更新された内部状態
 */
export function updateInternalState(
  currentState: InternalState,
  userInput: string,
  assistantResponse: string,
  newPersona?: Partial<PersonaState>,
  newInertia?: PersonaInertia | undefined
): InternalState {
  // Amatsu-Kanagi: 前の思考軸を尊重し、入力に基づいて決定論的に遷移
  const prevAxis = currentState.thinkingAxis;
  const nextAxis = transitionAxis(prevAxis, userInput, currentState.conversationCount);

  // PHASE R-5: 会話履歴を更新（ユーザー入力とアシスタント応答を追加）
  let updatedHistory = addConversationTurn(currentState.conversationHistory, "user", userInput);
  updatedHistory = addConversationTurn(updatedHistory, "assistant", assistantResponse);

  return {
    persona: newPersona ? { ...currentState.persona, ...newPersona } : currentState.persona,
    thinkingAxis: nextAxis, // Amatsu-Kanagi エンジンで決定された軸を使用
    inertia: newInertia ?? currentState.inertia,
    conversationCount: currentState.conversationCount + 1,
    conversationHistory: updatedHistory,
  };
}

/**
 * PHASE R-5: 初期内部状態を作成
 * 
 * @param persona 初期人格状態
 * @param thinkingAxis 初期思考軸
 * @param inertia 初期慣性（オプション）
 * @returns 初期化された内部状態
 */
export function createInitialInternalState(
  persona: PersonaState,
  thinkingAxis: ThinkingAxis,
  inertia?: PersonaInertia | undefined
): InternalState {
  return {
    persona,
    thinkingAxis,
    inertia,
    conversationCount: 0,
    conversationHistory: [],
  };
}

