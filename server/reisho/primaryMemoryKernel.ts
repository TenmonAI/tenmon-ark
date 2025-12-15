/**
 * ============================================================
 *  PRIMARY MEMORY KERNEL — プライマリメモリカーネル
 * ============================================================
 * 
 * Reishō Memory をプライマリカーネルに設定
 * すべてのメモリ操作が Reishō Memory Kernel 経由で実行される
 * 
 * 機能:
 * - Reishō Memory Kernel をプライマリに設定
 * - 従来の Synaptic Memory との統合
 * - 自動的なシードベースの記憶管理
 * ============================================================
 */

import { createReishoMemoryKernel, storeSeedInMemoryKernel, retrieveSeedsFromMemoryKernel, type ReishoMemoryKernel } from "./memoryKernelV2";
import { getGlobalUniverseOS } from "./universeOSIntegration";
import type { UniversalStructuralSeed } from "../../kokuzo/fractal/seedV2";
import type { MemoryContext } from "../synapticMemory";

/**
 * プライマリメモリカーネル（グローバル）
 */
let primaryMemoryKernel: ReishoMemoryKernel | null = null;

/**
 * Reishō Memory をプライマリカーネルに設定
 */
export function setReishoMemoryAsPrimaryKernel(): ReishoMemoryKernel {
  // 既に設定されている場合は返す
  if (primaryMemoryKernel) {
    return primaryMemoryKernel;
  }
  
  // Universe OS から取得、または新規作成
  const universeOS = getGlobalUniverseOS();
  if (universeOS) {
    primaryMemoryKernel = universeOS.memoryKernel;
  } else {
    primaryMemoryKernel = createReishoMemoryKernel();
  }
  
  return primaryMemoryKernel;
}

/**
 * プライマリメモリカーネルを取得
 */
export function getPrimaryMemoryKernel(): ReishoMemoryKernel {
  if (!primaryMemoryKernel) {
    return setReishoMemoryAsPrimaryKernel();
  }
  return primaryMemoryKernel;
}

/**
 * シードをプライマリメモリカーネルに保存
 */
export function storeSeedInPrimaryKernel(
  seed: UniversalStructuralSeed,
  layer: "STM" | "MTM" | "LTM" | "REISHO_LTM" = "MTM",
  importance: number = 0.5
): void {
  const kernel = getPrimaryMemoryKernel();
  storeSeedInMemoryKernel(kernel, seed, layer, importance);
  
  // Universe OS も更新
  const universeOS = getGlobalUniverseOS();
  if (universeOS) {
    universeOS.memoryKernel = kernel;
  }
}

/**
 * プライマリメモリカーネルからシードを取得
 */
export function retrieveSeedsFromPrimaryKernel(
  query: string,
  limit: number = 10,
  layers: ("STM" | "MTM" | "LTM" | "REISHO_LTM")[] = ["STM", "MTM", "LTM", "REISHO_LTM"]
): any[] {
  const kernel = getPrimaryMemoryKernel();
  return retrieveSeedsFromMemoryKernel(kernel, query, limit, layers);
}

/**
 * プライマリメモリカーネルから Memory Context を生成
 */
export async function getPrimaryMemoryContext(
  userId: number,
  conversationId: number,
  limit: number = 10
): Promise<MemoryContext> {
  // プライマリメモリカーネルからシードを取得
  const seeds = retrieveSeedsFromPrimaryKernel("", limit);
  
  // シードを文字列に変換
  const seedContents = seeds.map(entry => {
    const tags = entry.seed.compressedRepresentation.mainTags.join(", ");
    return `[${entry.layer}] ${tags}`;
  });
  
  // 従来の Synaptic Memory も取得（統合）
  const { getUserMemoryContext } = await import("../synapticMemory");
  const synapticContext = await getUserMemoryContext(userId, conversationId, limit);
  
  // 統合して返す
  return {
    ltm: [...synapticContext.ltm, ...seedContents.filter((_, idx) => idx < limit / 2)],
    mtm: [...synapticContext.mtm, ...seedContents.filter((_, idx) => idx >= limit / 2 && idx < limit)],
    stm: synapticContext.stm,
  };
}

export default {
  setReishoMemoryAsPrimaryKernel,
  getPrimaryMemoryKernel,
  storeSeedInPrimaryKernel,
  retrieveSeedsFromPrimaryKernel,
  getPrimaryMemoryContext,
};

