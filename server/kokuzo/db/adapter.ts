/**
 * ============================================================
 *  KOKŪZŌ DB ADAPTER — データベースアダプター
 * ============================================================
 * 
 * Kokūzō Server のデータベースアダプター
 * ============================================================
 */

import { getDb } from "../../db";
import { kzFiles, semanticUnits, fractalSeeds } from "../../../drizzle/kokuzoSchema";
import type { KzFile, SemanticUnit, FractalSeed } from "../../../drizzle/kokuzoSchema";
import { eq } from "drizzle-orm";

/**
 * KzFile を保存
 */
export async function saveKzFile(file: KzFile): Promise<void> {
  const db = await getDb();
  await db.insert(kzFiles).values(file).onDuplicateKeyUpdate({
    set: {
      name: file.name,
      path: file.path,
      type: file.type,
      size: file.size,
      mimeType: file.mimeType,
      hash: file.hash,
      semanticUnitIds: file.semanticUnitIds,
      fractalSeedIds: file.fractalSeedIds,
      reishoSignature: file.reishoSignature,
      updatedAt: new Date(),
    },
  });
}

/**
 * KzFile を取得
 */
export async function getKzFile(id: string): Promise<KzFile | null> {
  const db = await getDb();
  const result = await db.select().from(kzFiles).where(eq(kzFiles.id, id)).limit(1);
  return result[0] || null;
}

/**
 * SemanticUnit を保存
 */
export async function saveSemanticUnit(unit: SemanticUnit): Promise<void> {
  const db = await getDb();
  await db.insert(semanticUnits).values(unit).onDuplicateKeyUpdate({
    set: {
      text: unit.text,
      embedding: unit.embedding,
      metadata: unit.metadata,
      reishoSignature: unit.reishoSignature,
      importance: unit.importance,
      lifecycle: unit.lifecycle,
      updatedAt: new Date(),
    },
  });
}

/**
 * SemanticUnit を更新（GAP-C: ライフサイクル管理用）
 */
export async function updateSemanticUnit(unit: SemanticUnit): Promise<void> {
  await saveSemanticUnit(unit);
}

/**
 * SemanticUnit を取得
 */
export async function getSemanticUnit(id: string): Promise<SemanticUnit | null> {
  const db = await getDb();
  const result = await db.select().from(semanticUnits).where(eq(semanticUnits.id, id)).limit(1);
  return result[0] || null;
}

/**
 * FractalSeed を保存
 */
export async function saveFractalSeed(seed: FractalSeed): Promise<void> {
  const db = await getDb();
  await db.insert(fractalSeeds).values(seed).onDuplicateKeyUpdate({
    set: {
      semanticUnitIds: seed.semanticUnitIds,
      metadata: seed.metadata,
      compressedRepresentation: seed.compressedRepresentation,
      reishoSignature: seed.reishoSignature,
      structuralParams: seed.structuralParams,
      lifecycle: seed.lifecycle,
      updatedAt: new Date(),
    },
  });
}

/**
 * FractalSeed を更新（GAP-C: ライフサイクル管理用）
 */
export async function updateFractalSeed(seed: FractalSeed): Promise<void> {
  await saveFractalSeed(seed);
}

/**
 * FractalSeed を取得
 */
export async function getFractalSeed(id: string): Promise<FractalSeed | null> {
  const db = await getDb();
  const result = await db.select().from(fractalSeeds).where(eq(fractalSeeds.id, id)).limit(1);
  return result[0] || null;
}

/**
 * すべての SemanticUnit を取得
 */
export async function getAllSemanticUnits(limit: number = 100): Promise<SemanticUnit[]> {
  const db = await getDb();
  return await db.select().from(semanticUnits).limit(limit);
}

/**
 * すべての FractalSeed を取得
 */
export async function getAllFractalSeeds(limit: number = 100): Promise<FractalSeed[]> {
  const db = await getDb();
  return await db.select().from(fractalSeeds).limit(limit);
}

export default {
  saveKzFile,
  getKzFile,
  saveSemanticUnit,
  updateSemanticUnit,
  getSemanticUnit,
  saveFractalSeed,
  updateFractalSeed,
  getFractalSeed,
  getAllSemanticUnits,
  getAllFractalSeeds,
};

