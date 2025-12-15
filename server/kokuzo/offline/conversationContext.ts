/**
 * ============================================================
 *  CONVERSATION CONTEXT — Conversation Engine 接続
 * ============================================================
 * 
 * ローカルファーストで会話コンテキストを取得
 * ============================================================
 */

import type { LocalKokuzoKernel } from "../offline/localKokuzoKernel";
import type { LocalSeed } from "../offline/localKokuzoKernel";

export interface ConversationContext {
  recentSeeds: LocalSeed[];
  semanticUnits: any[];
  reishoSignature: any;
  memoryContext: any;
}

/**
 * ローカルファーストで会話コンテキストを取得
 */
export async function getConversationContextLocalFirst(
  localKokuzoKernel: LocalKokuzoKernel,
  message: string
): Promise<ConversationContext> {
  // 1. 最近使用された Seed を取得
  const recentSeeds = await localKokuzoKernel.getRecentlyUsedSeeds(10);

  // 2. メッセージに関連する Seed を検索
  const relatedSeeds = await localKokuzoKernel.queryByKeyword(message);

  // 3. SemanticUnit を取得
  const semanticUnits = await localKokuzoKernel.getAllSemanticUnits(20);

  // 4. Reishō シグネチャを取得
  const reishoSignature = await localKokuzoKernel.getReishoSignature() || null;

  // 5. メモリコンテキストを構築
  const memoryContext = {
    seeds: [...recentSeeds, ...relatedSeeds],
    units: semanticUnits,
    timestamp: Date.now(),
  };

  return {
    recentSeeds: [...recentSeeds, ...relatedSeeds],
    semanticUnits,
    reishoSignature,
    memoryContext,
  };
}

/**
 * Reishō Pipeline をローカル Kokūzō に接続
 */
export function connectReishoPipelineToLocalKokuzo(
  reishoPipeline: any,
  localKokuzoKernel: LocalKokuzoKernel
): void {
  // 実際の実装では、Reishō Pipeline のコンテキスト取得をローカル Kokūzō にルーティング
  // reishoPipeline.getContext = async (message: string) => {
  //   return await getConversationContextLocalFirst(localKokuzoKernel, message);
  // };
}

/**
 * 推論エンジンをネットワーク非依存にする
 */
export function ensureReasoningEngineIsNetworkAgnostic(
  reasoningEngine: any,
  localKokuzoKernel: LocalKokuzoKernel
): void {
  // 実際の実装では、推論エンジンのメモリ取得をローカル Kokūzō にルーティング
  // reasoningEngine.getMemory = async (query: string) => {
  //   return await getConversationContextLocalFirst(localKokuzoKernel, query);
  // };
}

export default {
  getConversationContextLocalFirst,
  connectReishoPipelineToLocalKokuzo,
  ensureReasoningEngineIsNetworkAgnostic,
};

