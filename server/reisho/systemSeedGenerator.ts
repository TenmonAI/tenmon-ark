/**
 * ============================================================
 *  SYSTEM SEED GENERATOR — システムシードジェネレータ
 * ============================================================
 * 
 * Fractal Engine をシステムシードジェネレータに昇格
 * すべてのシード生成が Fractal Engine 経由で実行される
 * 
 * 機能:
 * - SemanticUnit から UniversalStructuralSeed を生成
 * - 過圧縮を自動適用
 * - Universe OS に自動登録
 * ============================================================
 */

import { createFractalSeed } from "../../kokuzo/fractal/seed";
import { upgradeToUniversalStructuralSeed } from "../../kokuzo/fractal/seedV2";
import { enableFractalOvercompression } from "./fractalOvercompression";
import { getGlobalUniverseOS } from "./universeOSIntegration";
import type { SemanticUnit } from "../../kokuzo/semantic/engine";
import type { UniversalStructuralSeed } from "../../kokuzo/fractal/seedV2";

/**
 * Fractal Engine をシステムシードジェネレータに昇格
 */
export function promoteFractalEngineAsSystemSeedGenerator(
  semanticUnits: SemanticUnit[]
): UniversalStructuralSeed {
  if (semanticUnits.length === 0) {
    throw new Error("Cannot generate seed from empty semantic units");
  }
  
  // 1. SemanticUnit から FractalSeed を生成
  const fractalSeed = createFractalSeed(semanticUnits);
  
  // 2. UniversalStructuralSeed にアップグレード
  const universalSeed = upgradeToUniversalStructuralSeed(fractalSeed, semanticUnits);
  
  // 3. 過圧縮を適用
  const overcompressed = enableFractalOvercompression(universalSeed);
  
  // 4. Universe OS に登録
  const universeOS = getGlobalUniverseOS();
  if (universeOS) {
    universeOS.overcompressedSeeds.push(overcompressed);
    universeOS.osCore.integratedSeeds.push(universalSeed);
  }
  
  return universalSeed;
}

/**
 * 複数の SemanticUnit セットから複数のシードを生成
 */
export function generateSystemSeeds(
  semanticUnitSets: SemanticUnit[][]
): UniversalStructuralSeed[] {
  return semanticUnitSets.map(units => 
    promoteFractalEngineAsSystemSeedGenerator(units)
  );
}

/**
 * テキストから直接シードを生成（簡易版）
 */
export async function generateSeedFromText(
  text: string,
  ownerId: string
): Promise<UniversalStructuralSeed> {
  // SemanticUnit を生成（実際の実装では splitIntoSemanticUnits を使用）
  const { splitIntoSemanticUnits } = await import("../../kokuzo/semantic/engine");
  const semanticUnits = await splitIntoSemanticUnits(text, ownerId);
  
  // シードを生成
  return promoteFractalEngineAsSystemSeedGenerator(semanticUnits);
}

export default {
  promoteFractalEngineAsSystemSeedGenerator,
  generateSystemSeeds,
  generateSeedFromText,
};

