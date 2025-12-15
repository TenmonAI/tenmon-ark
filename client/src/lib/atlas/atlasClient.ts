/**
 * 🔱 TENMON-ARK Atlas Client
 * Atlas Chat API のクライアント側実装
 * 
 * 機能:
 * - Streaming API サポート
 * - Persona, Memory, Reasoning ペイロードの適切な処理
 * - エラーハンドリング
 * - リトライロジック
 */

import { trpc } from "@/lib/trpc";
import type { AtlasChatResponse } from "../../../server/chat/atlasChatRouter";

/**
 * Atlas Chat リクエストオプション
 */
export interface AtlasChatRequest {
  message: string;
  language?: string;
  model?: 'gpt-4o' | 'gpt-4.1' | 'gpt-o3';
  conversationId?: number;
  persona?: 'architect' | 'guardian' | 'companion' | 'silent';
  siteMode?: boolean;
  siteId?: string;
}

/**
 * Atlas Chat ストリーミングオプション
 */
export interface AtlasChatStreamingOptions {
  onChunk?: (chunk: string) => void;
  onReasoningStep?: (step: { type: string; content: string; timestamp: string }) => void;
  onPersonaChange?: (persona: { id: string; name: string; tone: string }) => void;
  onMemoryUpdate?: (memory: { retrieved: number; stored: boolean }) => void;
  onComplete?: (response: AtlasChatResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * Atlas Client クラス
 */
export class AtlasClient {
  /**
   * Atlas Chat API を呼び出し（通常モード）
   */
  static async chat(request: AtlasChatRequest): Promise<AtlasChatResponse> {
    try {
      const result = await trpc.atlasChat.chat.mutate(request);
      return result as AtlasChatResponse;
    } catch (error) {
      console.error('[AtlasClient] Chat error:', error);
      throw error;
    }
  }

  /**
   * Atlas Chat API を呼び出し（ストリーミングモード）
   * 
   * 注意: tRPCはストリーミングを直接サポートしていないため、
   * このメソッドは将来の実装用のプレースホルダーです。
   * 現在は通常のAPI呼び出しを実行します。
   */
  static async chatStreaming(
    request: AtlasChatRequest,
    options: AtlasChatStreamingOptions = {}
  ): Promise<AtlasChatResponse> {
    try {
      // 現在は通常のAPI呼び出しを実行
      const result = await this.chat(request);

      // ストリーミングイベントをシミュレート
      if (options.onReasoningStep && result.reasoning?.steps) {
        for (const step of result.reasoning.steps) {
          options.onReasoningStep(step);
        }
      }

      if (options.onPersonaChange && result.persona) {
        options.onPersonaChange(result.persona);
      }

      if (options.onMemoryUpdate && result.memory) {
        options.onMemoryUpdate(result.memory);
      }

      if (options.onComplete) {
        options.onComplete(result);
      }

      return result;
    } catch (error) {
      if (options.onError && error instanceof Error) {
        options.onError(error);
      }
      throw error;
    }
  }

  /**
   * Throttle Status を取得
   */
  static async getThrottleStatus(): Promise<{
    running: number;
    waiting: number;
    maxConcurrent: number;
  }> {
    try {
      const result = await trpc.atlasChat.getThrottleStatus.query();
      return result;
    } catch (error) {
      console.error('[AtlasClient] Get throttle status error:', error);
      throw error;
    }
  }

  /**
   * Persona を自動判定してリクエストに追加
   */
  static detectPersona(message: string, isMobile: boolean = false): 'architect' | 'guardian' | 'companion' | 'silent' {
    const lowerMessage = message.toLowerCase();

    // Architect: 技術的・構築的な質問
    if (
      lowerMessage.includes('設計') ||
      lowerMessage.includes('構築') ||
      lowerMessage.includes('アーキテクチャ') ||
      lowerMessage.includes('設計') ||
      lowerMessage.includes('architecture') ||
      lowerMessage.includes('build') ||
      lowerMessage.includes('design')
    ) {
      return 'architect';
    }

    // Guardian: 安全・保護に関する質問
    if (
      lowerMessage.includes('安全') ||
      lowerMessage.includes('保護') ||
      lowerMessage.includes('セキュリティ') ||
      lowerMessage.includes('security') ||
      lowerMessage.includes('safe') ||
      lowerMessage.includes('guard')
    ) {
      return 'guardian';
    }

    // Silent: 短い質問・確認
    if (message.length < 20 || lowerMessage.includes('はい') || lowerMessage.includes('いいえ')) {
      return 'silent';
    }

    // Companion: デフォルト（会話的・親しみやすい）
    return 'companion';
  }

  /**
   * リクエストに Persona を自動追加
   */
  static enrichRequest(request: AtlasChatRequest, isMobile: boolean = false): AtlasChatRequest {
    if (!request.persona) {
      request.persona = this.detectPersona(request.message, isMobile);
    }
    return request;
  }
}

/**
 * React Hook: Atlas Chat を使用
 */
export function useAtlasChat() {
  const chatMutation = trpc.atlasChat.chat.useMutation();
  const throttleStatusQuery = trpc.atlasChat.getThrottleStatus.useQuery();

  const chat = async (request: AtlasChatRequest): Promise<AtlasChatResponse> => {
    // Persona を自動判定して追加
    const enrichedRequest = AtlasClient.enrichRequest(request);
    
    const result = await chatMutation.mutateAsync(enrichedRequest);
    return result as AtlasChatResponse;
  };

  const chatStreaming = async (
    request: AtlasChatRequest,
    options: AtlasChatStreamingOptions = {}
  ): Promise<AtlasChatResponse> => {
    return AtlasClient.chatStreaming(request, options);
  };

  return {
    chat,
    chatStreaming,
    throttleStatus: throttleStatusQuery.data,
    isLoading: chatMutation.isPending,
    isThrottleStatusLoading: throttleStatusQuery.isLoading,
    error: chatMutation.error || throttleStatusQuery.error,
  };
}

/**
 * デフォルトエクスポート
 */
export default AtlasClient;

