/**
 * Universal Memory Router vΦ
 * 
 * 🌕 MEMORY UNITY vΦ Phase 9 実装
 * 
 * 全サービス（LP/Chat/API/SNS/Bot）で記憶を単一化するルーターを構築します。
 * Persona/Centerline は単一化し、分岐しません。
 * 
 * 仕様:
 * 1. 全サービスで同一の getUserMemoryContext() を使用
 * 2. Persona/Centerline は単一化（分岐禁止）
 * 3. 記憶は userId ベースで統合
 * 4. サービス固有の conversationId を使用
 * 5. Memory Sync は全サービスで共通
 */

import {
  getUserMemoryContext,
  saveMemory,
  MemoryContext,
  ImportanceLevel,
  MemoryCategory,
} from '../synapticMemory';
import { getCenterlinePersona } from '../chat/centerlineProtocol';

/**
 * サービスタイプ
 */
export type ServiceType = 'lp-qa' | 'chat' | 'api' | 'sns' | 'bot';

/**
 * Universal Memory Context
 * 全サービス共通のメモリコンテキスト
 */
export interface UniversalMemoryContext {
  userId: number;
  serviceType: ServiceType;
  conversationId: number;
  memoryContext: MemoryContext;
  centerlinePersona: string;
}

/**
 * Universal Memory Router vΦ
 * 
 * 全サービスで統一されたメモリコンテキストを取得します。
 * 
 * @param userId ユーザーID
 * @param serviceType サービスタイプ
 * @param conversationId 会話ID（サービス固有）
 * @param language 言語
 * @returns Universal Memory Context
 */
export async function getUniversalMemoryContext(
  userId: number,
  serviceType: ServiceType,
  conversationId: number,
  language: string = 'ja'
): Promise<UniversalMemoryContext> {
  // 1. Synaptic Memory から記憶を取得
  const memoryContext = await getUserMemoryContext(userId, conversationId);

  // 2. Centerline Persona を取得（全サービス共通）
  const centerlinePersona = getCenterlinePersona(language);

  return {
    userId,
    serviceType,
    conversationId,
    memoryContext,
    centerlinePersona,
  };
}

/**
 * Universal Memory Save
 * 
 * 全サービスで統一された記憶保存を行います。
 * 
 * @param userId ユーザーID
 * @param serviceType サービスタイプ
 * @param content 記憶内容
 * @param importance 重要度
 * @param category カテゴリー
 * @returns 保存成功フラグ
 */
export async function saveUniversalMemory(
  userId: number,
  serviceType: ServiceType,
  content: string,
  importance: ImportanceLevel = 'neutral',
  category: MemoryCategory = 'conversation_recent'
): Promise<boolean> {
  try {
    // サービスタイプをプレフィックスとして追加
    const prefixedContent = `[${serviceType.toUpperCase()}] ${content}`;

    await saveMemory(userId, prefixedContent, importance, category);
    return true;
  } catch (error) {
    console.error('[Universal Memory Router] Failed to save memory:', error);
    return false;
  }
}

/**
 * Universal Memory Context Builder
 * 
 * LLM プロンプト用のメモリコンテキストを構築します。
 * 
 * @param universalContext Universal Memory Context
 * @returns LLM プロンプト用のメモリコンテキスト文字列
 */
export function buildMemoryPrompt(universalContext: UniversalMemoryContext): string {
  const { memoryContext, centerlinePersona } = universalContext;

  // Centerline Persona（最優先）
  let prompt = `${centerlinePersona}\n\n`;

  // LTM（長期記憶）
  if (memoryContext.ltm.length > 0) {
    prompt += `## 長期記憶（LTM）\n\n`;
    memoryContext.ltm.forEach((mem) => {
      prompt += `- ${mem}\n`;
    });
    prompt += `\n`;
  }

  // MTM（中期記憶）
  if (memoryContext.mtm.length > 0) {
    prompt += `## 中期記憶（MTM）\n\n`;
    memoryContext.mtm.forEach((mem) => {
      prompt += `- ${mem}\n`;
    });
    prompt += `\n`;
  }

  // STM（短期記憶）
  if (memoryContext.stm.length > 0) {
    prompt += `## 短期記憶（STM）\n\n`;
    memoryContext.stm.forEach((mem) => {
      prompt += `- ${mem}\n`;
    });
    prompt += `\n`;
  }

  return prompt;
}

/**
 * Service-Specific Conversation ID Mapper
 * 
 * サービス固有の conversationId を統一的に管理します。
 * 
 * @param userId ユーザーID
 * @param serviceType サービスタイプ
 * @param serviceConversationId サービス固有の会話ID
 * @returns 統一された conversationId
 */
export function mapConversationId(
  userId: number,
  serviceType: ServiceType,
  serviceConversationId: number
): number {
  // サービスタイプごとに conversationId の範囲を分ける
  // - LP-QA: 0
  // - Chat: 1〜999999
  // - API: 1000000〜1999999
  // - SNS: 2000000〜2999999
  // - Bot: 3000000〜3999999

  switch (serviceType) {
    case 'lp-qa':
      return 0; // LP-QA は常に 0
    case 'chat':
      return serviceConversationId; // Chat は 1〜999999
    case 'api':
      return 1000000 + serviceConversationId;
    case 'sns':
      return 2000000 + serviceConversationId;
    case 'bot':
      return 3000000 + serviceConversationId;
    default:
      return serviceConversationId;
  }
}

/**
 * Reverse Conversation ID Mapper
 * 
 * 統一された conversationId からサービス固有の conversationId を取得します。
 * 
 * @param conversationId 統一された conversationId
 * @returns { serviceType, serviceConversationId }
 */
export function reverseMapConversationId(conversationId: number): {
  serviceType: ServiceType;
  serviceConversationId: number;
} {
  if (conversationId === 0) {
    return { serviceType: 'lp-qa', serviceConversationId: 0 };
  } else if (conversationId < 1000000) {
    return { serviceType: 'chat', serviceConversationId: conversationId };
  } else if (conversationId < 2000000) {
    return { serviceType: 'api', serviceConversationId: conversationId - 1000000 };
  } else if (conversationId < 3000000) {
    return { serviceType: 'sns', serviceConversationId: conversationId - 2000000 };
  } else {
    return { serviceType: 'bot', serviceConversationId: conversationId - 3000000 };
  }
}

/**
 * Universal Memory Stats
 * 
 * 全サービスの記憶統計情報を取得します。
 * 
 * @param userId ユーザーID
 * @returns 記憶統計情報
 */
export async function getUniversalMemoryStats(userId: number): Promise<{
  totalStm: number;
  totalMtm: number;
  totalLtm: number;
  byService: Record<ServiceType, { stm: number; mtm: number; ltm: number }>;
}> {
  const services: ServiceType[] = ['lp-qa', 'chat', 'api', 'sns', 'bot'];
  const byService: Record<ServiceType, { stm: number; mtm: number; ltm: number }> = {
    'lp-qa': { stm: 0, mtm: 0, ltm: 0 },
    'chat': { stm: 0, mtm: 0, ltm: 0 },
    'api': { stm: 0, mtm: 0, ltm: 0 },
    'sns': { stm: 0, mtm: 0, ltm: 0 },
    'bot': { stm: 0, mtm: 0, ltm: 0 },
  };

  let totalStm = 0;
  let totalMtm = 0;
  let totalLtm = 0;

  for (const service of services) {
    const conversationId = mapConversationId(userId, service, 0);
    const memoryContext = await getUserMemoryContext(userId, conversationId);

    byService[service] = {
      stm: memoryContext.stm.length,
      mtm: memoryContext.mtm.length,
      ltm: memoryContext.ltm.length,
    };

    totalStm += memoryContext.stm.length;
    totalMtm += memoryContext.mtm.length;
    totalLtm += memoryContext.ltm.length;
  }

  return {
    totalStm,
    totalMtm,
    totalLtm,
    byService,
  };
}
