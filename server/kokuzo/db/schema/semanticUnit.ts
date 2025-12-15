/**
 * ============================================================
 *  SEMANTIC UNIT SCHEMA — セマンティックユニットスキーマ
 * ============================================================
 * 
 * Kokūzō Server のセマンティックユニット永続化スキーマ
 * 
 * 構成:
 * - テキストコンテンツ
 * - セマンティックベクトル
 * - メタデータ
 * - Reishō シグネチャ
 * ============================================================
 */

import { z } from "zod";

/**
 * Semantic Unit Schema
 */
export const semanticUnitSchema = z.object({
  /** セマンティックユニットID */
  id: z.string(),
  
  /** テキストコンテンツ */
  text: z.string(),
  
  /** セマンティックベクトル（埋め込み） */
  embedding: z.array(z.number()).optional(),
  
  /** メタデータ */
  metadata: z.object({
    source: z.string().optional(),
    sourceId: z.string().optional(),
    position: z.object({
      start: z.number(),
      end: z.number(),
    }).optional(),
    tags: z.array(z.string()).default([]),
    conversationId: z.string().optional(), // 会話ID
    projectId: z.number().nullable().optional(), // プロジェクトID
  }).default({}),
  
  /** Reishō シグネチャ */
  reishoSignature: z.object({
    reishoValue: z.number(),
    kanagiPhase: z.string(),
    fireWaterBalance: z.number(),
    unifiedFireWaterTensor: z.array(z.number()).optional(),
    kanagiPhaseTensor: z.array(z.array(z.number())).optional(),
    kotodamaHelixTensor: z.array(z.number()).optional(),
  }).optional(),
  
  /** 重要度 */
  importance: z.number().default(0.5),
  
  /** ライフサイクル管理（GAP-C） */
  lifecycle: z.object({
    weight: z.number().min(0.0).max(1.0).default(0.5), // Weight (0.0 - 1.0)
    lastReferencedAt: z.number().default(() => Date.now()), // 最後に参照された時刻
    ttlHint: z.number().optional(), // Soft TTL（ヒントのみ、強制削除はしない）
  }).optional(),
  
  /** 作成日時 */
  createdAt: z.number(),
  
  /** 更新日時 */
  updatedAt: z.number(),
});

export type SemanticUnit = z.infer<typeof semanticUnitSchema>;

/**
 * Semantic Unit を作成
 */
export function createSemanticUnit(data: {
  id: string;
  text: string;
  embedding?: number[];
  metadata?: SemanticUnit["metadata"];
  reishoSignature?: SemanticUnit["reishoSignature"];
  importance?: number;
  lifecycle?: SemanticUnit["lifecycle"];
}): SemanticUnit {
  const now = Date.now();
  
  return {
    id: data.id,
    text: data.text,
    embedding: data.embedding,
    metadata: data.metadata || {},
    reishoSignature: data.reishoSignature,
    importance: data.importance || 0.5,
    lifecycle: data.lifecycle || {
      weight: data.importance || 0.5,
      lastReferencedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export default {
  semanticUnitSchema,
  createSemanticUnit,
};

