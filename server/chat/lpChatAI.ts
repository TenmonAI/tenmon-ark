/**
 * LP専用 Chat AI
 * 
 * LP Soft Personaを使用したLLM呼び出し関数
 * 本体チャットとは独立したシステムプロンプトを使用
 */

import { ChatMessage } from "../../drizzle/schema";
import { invokeLLM, type TextContent } from "../_core/llm";
import { LP_MINIMAL_PERSONA_SYSTEM_PROMPT } from "../prompts/lpMinimalPersona";
import {
  getUniversalMemoryContext,
  buildMemoryPrompt,
} from "../engines/universalMemoryRouter";
import { removeInternalTags } from "../utils/personaOutputFilter";
import { measurePerformance, logPerformance } from "../config/turboEngineV10";

/**
 * LP専用 Chat Response生成
 * 
 * LP Soft Personaのシステムプロンプトを使用
 * depth / fireWaterBalance / reasoning / IFE を正しく適用
 * 
 * @param params - パラメータ
 * @returns AI応答テキスト
 */
export async function generateLpChatResponse(params: {
  userId: number;
  messages: ChatMessage[];
  language: string;
  depth?: string;
  fireWaterBalance?: string;
  enableMemorySync?: boolean;
}): Promise<string> {
  const startTime = Date.now(); // Turbo Engine v10: Performance tracking

  try {
    // 1. LP Minimal Personaのシステムプロンプトを取得
    const baseSystemPrompt = LP_MINIMAL_PERSONA_SYSTEM_PROMPT;

    // 2. Universal Memory Routerからコンテキストを取得（enableMemorySyncがtrueの場合）
    let memoryContext = '';
    if (params.enableMemorySync && params.userId > 0) {
      const universalContext = await getUniversalMemoryContext(
        params.userId,
        'lp-qa',
        0,
        params.language
      );
      memoryContext = buildMemoryPrompt(universalContext);
    }

    // 3. システムプロンプトとメモリコンテキストを統合
    let finalSystemPrompt = baseSystemPrompt;
    if (memoryContext) {
      finalSystemPrompt = `${baseSystemPrompt}\n\n【記憶コンテキスト】\n${memoryContext}`;
    }

    // 4. depth / fireWaterBalance の指示を追加
    if (params.depth) {
      const depthInstructions: Record<string, string> = {
        surface: '簡潔で分かりやすい回答を心がけてください。',
        middle: '適度な詳しさで、バランスの取れた回答を心がけてください。',
        deep: '詳しく、深い洞察を含めた回答を心がけてください。',
        specialized: '専門的で、技術的な詳細を含めた回答を心がけてください。',
      };
      if (depthInstructions[params.depth]) {
        finalSystemPrompt += `\n\n【回答の深さ】\n${depthInstructions[params.depth]}`;
      }
    }

    if (params.fireWaterBalance) {
      const fireWaterInstructions: Record<string, string> = {
        fire: '外発的で、創造的な思考を重視してください。',
        water: '内集的で、調和的な思考を重視してください。',
        balanced: '火と水のバランスを取り、調和的な回答を心がけてください。',
      };
      if (fireWaterInstructions[params.fireWaterBalance]) {
        finalSystemPrompt += `\n\n【火水バランス】\n${fireWaterInstructions[params.fireWaterBalance]}`;
      }
    }

    // 5. 会話履歴をメッセージ形式に変換
    const conversationMessages = params.messages.map((msg) => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
    }));

    // 6. LLM呼び出し（vΩ-FIX STEP 5: デバッグログ追加）
    console.log('[LP-DEBUG] systemPrompt:', finalSystemPrompt.substring(0, 200) + '...');
    console.log('[LP-DEBUG] messages:', conversationMessages);
    console.log('[LP Chat AI] Invoking LLM with LP Soft Persona');
    console.log('[LP Chat AI] System Prompt Length:', finalSystemPrompt.length);
    console.log('[LP Chat AI] Messages Count:', conversationMessages.length);
    console.log('[LP Chat AI] Depth:', params.depth);
    console.log('[LP Chat AI] Fire-Water Balance:', params.fireWaterBalance);
    console.log('[LP Chat AI] Enable Memory Sync:', params.enableMemorySync);

    const response = await invokeLLM({
      messages: [
        { role: "system", content: finalSystemPrompt },
        ...conversationMessages,
      ],
    });

    // 7. レスポンス処理
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from LLM");
    }

    // Handle content type (string or array)
    let responseText: string;
    if (typeof content === "string") {
      responseText = content;
    } else {
      // If content is an array, extract text from TextContent items
      const textContent = content
        .filter((item): item is TextContent => item.type === "text")
        .map((item) => item.text)
        .join("\n");
      responseText = textContent || "";
    }

    // 8. 内部タグを除去（レンダリング前加工層）
    const cleanResponse = removeInternalTags(responseText);

    // 9. Turbo Engine v10: Performance logging
    const elapsedTime = measurePerformance(startTime);
    logPerformance('generateLpChatResponse', elapsedTime);

    console.log('[LP Chat AI] Response generated successfully');
    console.log('[LP Chat AI] Response Length:', cleanResponse.length);

    return cleanResponse;
  } catch (error) {
    console.error("[LP Chat AI] Error generating response:", error);

    // Fallback response based on language
    const fallbackMessages: Record<string, string> = {
      ja: "申し訳ございません。現在、応答を生成できません。しばらくしてから再度お試しください。",
      en: "I apologize. I am currently unable to generate a response. Please try again later.",
      ko: "죄송합니다. 현재 응답을 생성할 수 없습니다. 나중에 다시 시도해 주세요.",
      "zh-CN": "抱歉,目前无法生成回应。请稍后再试。",
      "zh-TW": "抱歉,目前無法生成回應。請稍後再試。",
    };

    return fallbackMessages[params.language] || fallbackMessages["en"];
  }
}

/**
 * LP専用 LLM呼び出しRaw Payload記録
 * 
 * デバッグ用: LLM呼び出し時のペイロードを記録
 */
export async function logLpLlmPayload(params: {
  userId: number;
  messages: ChatMessage[];
  language: string;
  depth?: string;
  fireWaterBalance?: string;
  enableMemorySync?: boolean;
}): Promise<{
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  depth?: string;
  fireWaterBalance?: string;
  enableMemorySync?: boolean;
}> {
  // 1. LP Minimal Personaのシステムプロンプトを取得
  const baseSystemPrompt = LP_MINIMAL_PERSONA_SYSTEM_PROMPT;

  // 2. Universal Memory Routerからコンテキストを取得（enableMemorySyncがtrueの場合）
  let memoryContext = '';
  if (params.enableMemorySync && params.userId > 0) {
    const universalContext = await getUniversalMemoryContext(
      params.userId,
      'lp-qa',
      0,
      params.language
    );
    memoryContext = buildMemoryPrompt(universalContext);
  }

  // 3. システムプロンプトとメモリコンテキストを統合
  let finalSystemPrompt = baseSystemPrompt;
  if (memoryContext) {
    finalSystemPrompt = `${baseSystemPrompt}\n\n【記憶コンテキスト】\n${memoryContext}`;
  }

  // 4. depth / fireWaterBalance の指示を追加
  if (params.depth) {
    const depthInstructions: Record<string, string> = {
      surface: '簡潔で分かりやすい回答を心がけてください。',
      middle: '適度な詳しさで、バランスの取れた回答を心がけてください。',
      deep: '詳しく、深い洞察を含めた回答を心がけてください。',
      specialized: '専門的で、技術的な詳細を含めた回答を心がけてください。',
    };
    if (depthInstructions[params.depth]) {
      finalSystemPrompt += `\n\n【回答の深さ】\n${depthInstructions[params.depth]}`;
    }
  }

  if (params.fireWaterBalance) {
    const fireWaterInstructions: Record<string, string> = {
      fire: '外発的で、創造的な思考を重視してください。',
      water: '内集的で、調和的な思考を重視してください。',
      balanced: '火と水のバランスを取り、調和的な回答を心がけてください。',
    };
    if (fireWaterInstructions[params.fireWaterBalance]) {
      finalSystemPrompt += `\n\n【火水バランス】\n${fireWaterInstructions[params.fireWaterBalance]}`;
    }
  }

  // 5. 会話履歴をメッセージ形式に変換
  const conversationMessages = params.messages.map((msg) => ({
    role: msg.role as string,
    content: msg.content,
  }));

  return {
    systemPrompt: finalSystemPrompt,
    messages: conversationMessages,
    depth: params.depth,
    fireWaterBalance: params.fireWaterBalance,
    enableMemorySync: params.enableMemorySync,
  };
}
