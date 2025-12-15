/**
 * ============================================================
 *  KOKŪZŌ FILE SCHEMA — 永続化ファイルスキーマ
 * ============================================================
 * 
 * Kokūzō Server のファイル永続化スキーマ
 * 
 * 構成:
 * - ファイルメタデータ
 * - ファイルコンテンツ
 * - セマンティックユニット参照
 * - FractalSeed 参照
 * ============================================================
 */

import { z } from "zod";

/**
 * Kokūzō File Schema
 */
export const kzFileSchema = z.object({
  /** ファイルID */
  id: z.string(),
  
  /** ファイル名 */
  name: z.string(),
  
  /** ファイルパス */
  path: z.string(),
  
  /** ファイルタイプ */
  type: z.enum(["text", "pdf", "image", "audio", "video", "other"]),
  
  /** ファイルサイズ（バイト） */
  size: z.number(),
  
  /** MIMEタイプ */
  mimeType: z.string().optional(),
  
  /** ファイルハッシュ（SHA-256） */
  hash: z.string(),
  
  /** セマンティックユニットIDリスト */
  semanticUnitIds: z.array(z.string()).default([]),
  
  /** FractalSeed IDリスト */
  fractalSeedIds: z.array(z.string()).default([]),
  
  /** Reishō シグネチャ */
  reishoSignature: z.object({
    reishoValue: z.number(),
    kanagiPhase: z.string(),
    fireWaterBalance: z.number(),
  }).optional(),
  
  /** 作成日時 */
  createdAt: z.number(),
  
  /** 更新日時 */
  updatedAt: z.number(),
});

export type KzFile = z.infer<typeof kzFileSchema>;

/**
 * Kokūzō File を作成
 */
export function createKzFile(data: {
  id: string;
  name: string;
  path: string;
  type: KzFile["type"];
  size: number;
  mimeType?: string;
  hash: string;
}): KzFile {
  const now = Date.now();
  
  return {
    id: data.id,
    name: data.name,
    path: data.path,
    type: data.type,
    size: data.size,
    mimeType: data.mimeType,
    hash: data.hash,
    semanticUnitIds: [],
    fractalSeedIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export default {
  kzFileSchema,
  createKzFile,
};

