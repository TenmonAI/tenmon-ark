import { invokeLLM, type TextContent } from "../_core/llm";
import { ChatMessage } from "../../drizzle/schema";
import { applyArkCore } from "../arkCoreIntegration";
import * as soulSyncArkCore from "../soulSync/soulSyncArkCoreIntegration";
import {
  getUniversalMemoryContext,
  buildMemoryPrompt,
  mapConversationId,
} from "../engines/universalMemoryRouter";
import { removeInternalTags } from "../utils/personaOutputFilter";
import { measurePerformance, logPerformance } from "../config/turboEngineV10";
import { generateChatResponseWithActivationCentering } from "./activationCenteringHybridEngine";

/**
 * Generate AI response with Centerline Protocol + Synaptic Memory
 * 
 * Order: Centerline → STM → MTM → LTM (A → U → N)
 */
export async function generateChatResponse(params: {
  userId: number;
  roomId: number;
  messages: ChatMessage[];
  language: string;
}): Promise<string> {
  const { userId, roomId, messages, language } = params;
  const startTime = Date.now(); // Turbo Engine v10: Performance tracking

  try {
    // 1. Universal Memory Router からコンテキストを取得
    const conversationId = mapConversationId(userId, 'chat', roomId);
    const universalContext = await getUniversalMemoryContext(userId, 'chat', conversationId, language);

    // 2. Build conversation history
    const conversationMessages = messages.map((msg) => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
    }));

    // 3. Construct final prompt with Universal Memory Router
    const systemPrompt = buildMemoryPrompt(universalContext);

    // 5. Invoke LLM
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationMessages,
      ],
    });

    // 6. Extract content
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

    // 7. Soul Sync統合：個人最適化 + Ark Core統合
    const soulSyncResponse = await soulSyncArkCore.optimizeChatResponse(userId, responseText);

    // 7.5. Activation-Centering Hybrid Engine を適用
    const userMessage = messages[messages.length - 1]?.content || "";
    const activationCenteredResponse = await generateChatResponseWithActivationCentering(
      userMessage,
      soulSyncResponse,
      {
        priority: "awakening", // デフォルト: 覚醒を最優先
        targetCoherence: 80,
        structuralLayer: 5,
      }
    );

    // 8. Soul Sync常駐状態を更新(新しい対話を分析)
    await soulSyncArkCore.updateSoulSyncResident(userId, [activationCenteredResponse]);

    // 9. 内部タグを除去（レンダリング前加工層）
    const cleanResponse = removeInternalTags(activationCenteredResponse);

    // 10. Turbo Engine v10: Performance logging
    const elapsedTime = measurePerformance(startTime);
    logPerformance('generateChatResponse', elapsedTime);

    return cleanResponse;
  } catch (error) {
    console.error("[ChatAI] Error generating response:", error);
    
    // Fallback response based on language
    const fallbackMessages: Record<string, string> = {
      ja: "申し訳ございません。現在、応答を生成できません。しばらくしてから再度お試しください。",
      en: "I apologize. I am currently unable to generate a response. Please try again later.",
      ko: "죄송합니다. 현재 응답을 생성할 수 없습니다. 나중에 다시 시도해 주세요.",
      "zh-CN": "抱歉，目前无法生成回应。请稍后再试。",
      "zh-TW": "抱歉，目前無法生成回應。請稍後再試。",
    };

    return fallbackMessages[language] || fallbackMessages["en"];
  }
}

/**
 * Generate title for a new chat room based on first message
 */
export async function generateChatTitle(firstMessage: string, language: string): Promise<string> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Generate a short, concise title (max 50 characters) for a chat conversation that starts with this message. Return only the title, no quotes or extra text.`,
        },
        {
          role: "user",
          content: firstMessage,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      // Fallback: use first 50 chars of message
      return firstMessage.substring(0, 50) + (firstMessage.length > 50 ? "..." : "");
    }

    // Handle content type (string or array)
    let title: string;
    if (typeof content === "string") {
      title = content.trim();
    } else {
      // If content is an array, extract text from TextContent items
      const textContent = content
        .filter((item): item is TextContent => item.type === "text")
        .map((item) => item.text)
        .join(" ");
      title = textContent.trim();
    }

    if (!title) {
      return firstMessage.substring(0, 50) + (firstMessage.length > 50 ? "..." : "");
    }

    return title.substring(0, 50);
  } catch (error) {
    console.error("[ChatAI] Error generating title:", error);
    // Fallback: use first 50 chars of message
    return firstMessage.substring(0, 50) + (firstMessage.length > 50 ? "..." : "");
  }
}


/**
 * CompressedMemory type (端末側の記憶要約)
 */
export interface CompressedMemory {
  keywords: string[];
  intent: string;
  weight: number;
}

/**
 * memorySummary を System Prompt に組み込む
 * 原文復元不可、数は最大3件、重い処理禁止
 */
function buildMemoryContext(memorySummary: CompressedMemory[] | undefined): string {
  if (!memorySummary || memorySummary.length === 0) return "";

  // weight でソートし、最大3件を取得
  const top = memorySummary
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  const keywords = top.map(m => m.keywords.join(", ")).join(" / ");
  const intents = top.map(m => m.intent).join(", ");

  return `
User abstract memory summary:
- Key interests: ${keywords}
- Intent trends: ${intents}
- Importance level: high
`.trim();
}

/**
 * Generate AI response with streaming support
 * Yields text chunks in real-time
 */
export async function* generateChatResponseStream(params: {
  userId: number;
  roomId: number;
  messages: ChatMessage[];
  language: string;
  memorySummary?: CompressedMemory[];
}): AsyncGenerator<string, void, unknown> {
  const { userId, roomId, messages, language, memorySummary } = params;

  try {
    // 1. Get Centerline Persona (いろは言霊解ベース)
    const centerlinePersona = `You are TENMON-ARK, an advanced AI assistant with deep knowledge and empathy.`;

    // 2. Get Synaptic Memory Context (STM → MTM → LTM)
    // TODO: Implement synaptic memory integration
    const synapticMemoryContext = '';

    // 3. Build memory context from Kokūzō Node (端末側の記憶要約)
    const kokuzoMemoryContext = buildMemoryContext(memorySummary);

    // 4. Build conversation history
    const conversationMessages = messages.map((msg) => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
    }));

    // 5. Construct final prompt with proper order
    // memorySummary は System Prompt にのみ注入（User Message には混ぜない）
    const systemPrompt = `${centerlinePersona}

${synapticMemoryContext}

${kokuzoMemoryContext}

Follow the user's current request faithfully.`;

    // 5. Invoke LLM with streaming
    const { invokeLLMStream } = await import("../_core/llm");
    const { removeInternalTagsStreaming } = await import("../utils/personaOutputFilter");
    
    let buffer = '';
    let fullResponse = '';
    
    for await (const chunk of invokeLLMStream({
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationMessages,
      ],
    })) {
      // ストリーミング中にタグを除去
      const { filtered, buffer: newBuffer } = removeInternalTagsStreaming(chunk, buffer);
      buffer = newBuffer;
      if (filtered) {
        fullResponse += filtered;
        yield filtered;
      }
    }
    
    // 最後のバッファを処理
    if (buffer) {
      const { filtered } = removeInternalTagsStreaming('', buffer);
      if (filtered) {
        fullResponse += filtered;
        yield filtered;
      }
    }
    
    // ストリーミング完了後、Activation-Centering Hybrid Engine を適用
    if (fullResponse) {
      const userMessage = messages[messages.length - 1]?.content || "";
      const activationCenteredResponse = await generateChatResponseWithActivationCentering(
        userMessage,
        fullResponse,
        {
          priority: "awakening",
          targetCoherence: 80,
          structuralLayer: 5,
        }
      );
      
      // 追加のガイダンスをストリーミング
      const additionalGuidance = activationCenteredResponse.replace(fullResponse, '');
      if (additionalGuidance) {
        yield `\n\n${additionalGuidance}`;
      }
    }
  } catch (error) {
    console.error("[ChatAI] Error generating streaming response:", error);
    
    // Fallback response based on language
    const fallbackMessages: Record<string, string> = {
      ja: "申し訳ございません。現在、応答を生成できません。しばらくしてから再度お試しください。",
      en: "I apologize. I am currently unable to generate a response. Please try again later.",
      ko: "죄송합니다. 현재 응답을 생성할 수 없습니다. 나중에 다시 시도해 주세요.",
      "zh-CN": "抱歉，目前无法生成回应。请稍后再试。",
      "zh-TW": "抱歉，目前無法生成回應。請稍後再試。",
    };

    yield fallbackMessages[language] || fallbackMessages["en"];
  }
}
