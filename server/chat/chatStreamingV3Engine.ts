/**
 * Chat Streaming v3 Engine (GPT-grade)
 * 
 * TENMON-ARK SPEC準拠
 * - GPT同等のリアルタイムストリーミング
 * - Thinking Phases表示
 * - Error handling & reconnection
 */

import { generateChatResponseStream } from "./chatAI";

export interface StreamingEvent {
  type: "phase" | "message" | "done" | "error";
  data: any;
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
 * Generate streaming response with GPT-grade quality
 */
export async function* generateChatStreamingV3(params: {
  userId: number;
  roomId: number;
  messages: Array<{ role: string; content: string }>;
  language: string;
  memorySummary?: CompressedMemory[];
}): AsyncGenerator<StreamingEvent, void, unknown> {
  const { userId, roomId, messages, language, memorySummary } = params;
  
  try {
    // Phase 1: Analyzing
    yield {
      type: "phase",
      data: {
        phase: "analyzing",
        label: "Analyzing...",
        sublabel: "火の外発 - 解析",
        progress: 0,
      },
    };
    
    // Wait a bit for phase display
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    // Phase 2: Thinking
    yield {
      type: "phase",
      data: {
        phase: "thinking",
        label: "Thinking...",
        sublabel: "水の内集 - 思索",
        progress: 33,
      },
    };
    
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    // Phase 3: Responding
    yield {
      type: "phase",
      data: {
        phase: "responding",
        label: "Responding...",
        sublabel: "ミナカの呼吸 - 応答生成",
        progress: 66,
      },
    };
    
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    // Generate streaming response
    let chunkCount = 0;
    for await (const chunk of generateChatResponseStream({
      userId,
      roomId,
      messages,
      language,
      memorySummary,
    })) {
      chunkCount++;
      yield {
        type: "message",
        data: {
          chunk,
          chunkIndex: chunkCount,
        },
      };
    }
    
    // Done
    yield {
      type: "done",
      data: {
        success: true,
        totalChunks: chunkCount,
      },
    };
  } catch (error) {
    yield {
      type: "error",
      data: {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
    };
  }
}

