/**
 * ============================================================
 *  FRACTAL SEED SCHEMA — FractalSeed 永続化スキーマ
 * ============================================================
 * 
 * Kokūzō Server の FractalSeed 永続化スキーマ
 * 
 * 構成:
 * - FractalSeed メタデータ
 * - 圧縮表現
 * - Reishō シグネチャ
 * - 構造的パラメータ
 * ============================================================
 */

import { z } from "zod";

/**
 * Fractal Seed Schema
 */
export const fractalSeedSchema = z.object({
  /** FractalSeed ID */
  id: z.string(),
  
  /** セマンティックユニットIDリスト */
  semanticUnitIds: z.array(z.string()).default([]),
  
  /** メタデータ */
  metadata: z.object({
    conversationId: z.string().optional(), // 会話ID
    projectId: z.number().nullable().optional(), // プロジェクトID
  }).default({}),
  
  /** 圧縮表現 */
  compressedRepresentation: z.object({
    centroidVector: z.array(z.number()).optional(),
    kotodamaVector: z.array(z.number()).optional(),
    fireWaterBalance: z.number().optional(),
    kanagiPhaseMode: z.string().optional(),
    mainTags: z.array(z.string()).default([]),
    lawIds: z.array(z.string()).default([]),
    semanticEdges: z.array(z.object({
      targetId: z.string(),
      weight: z.number(),
    })).default([]),
    seedWeight: z.number().default(0.5),
  }),
  
  /** Reishō シグネチャ */
  reishoSignature: z.object({
    reishoValue: z.number(),
    kanagiPhase: z.string(),
    fireWaterBalance: z.number(),
    unifiedFireWaterTensor: z.array(z.number()).optional(),
    kanagiPhaseTensor: z.array(z.array(z.number())).optional(),
    kotodamaHelixTensor: z.array(z.number()).optional(),
  }).optional(),
  
  /** 構造的パラメータ */
  structuralParams: z.object({
    recursionPotential: z.number().default(0.5),
    contractionPotential: z.number().default(0.5),
    reishoCurve: z.number().optional(),
    kanagiDominance: z.number().optional(),
    deviceAffinityProfile: z.record(z.number()).default({}),
  }).default({}),
  
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

export type FractalSeed = z.infer<typeof fractalSeedSchema>;

/**
 * Fractal Seed を作成
 */
export function createFractalSeed(data: {
  id: string;
  semanticUnitIds?: string[];
  compressedRepresentation: FractalSeed["compressedRepresentation"];
  reishoSignature?: FractalSeed["reishoSignature"];
  structuralParams?: FractalSeed["structuralParams"];
  metadata?: FractalSeed["metadata"];
  lifecycle?: FractalSeed["lifecycle"];
}): FractalSeed {
  const now = Date.now();
  
  return {
    id: data.id,
    semanticUnitIds: data.semanticUnitIds || [],
    metadata: data.metadata || {},
    compressedRepresentation: data.compressedRepresentation,
    reishoSignature: data.reishoSignature,
    structuralParams: data.structuralParams || {},
    lifecycle: data.lifecycle || {
      weight: data.compressedRepresentation.seedWeight || 0.5,
      lastReferencedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export default {
  fractalSeedSchema,
  createFractalSeed,
};

