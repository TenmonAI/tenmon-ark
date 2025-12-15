/**
 * ============================================================
 *  REISHŌ MEMORY KERNEL v2 — Seed-Based Memory System
 * ============================================================
 * 
 * Memory Kernel を Reishō Seeds ベースで書き直し
 * すべての記憶が UniversalStructuralSeed として表現される
 * 
 * アーキテクチャ:
 * - STM: 最新の Reishō Seeds (24時間)
 * - MTM: 重要な Reishō Seeds (7-30日)
 * - LTM: 永続的な Reishō Seeds (永続)
 * - Reishō-LTM: 構造的 Reishō Seeds (永続、最高優先度)
 * ============================================================
 */

import type { UniversalStructuralSeed } from "../../kokuzo/fractal/seedV2";
import { storeReishoMemory, getReishoMemoryContext } from "../synapticMemory";
import { computeReishoSignature } from "./reishoKernel";
import { buildReishoMathCore } from "./mathCore";

export type MemoryLayer = "STM" | "MTM" | "LTM" | "REISHO_LTM";

export interface SeedMemoryEntry {
  seed: UniversalStructuralSeed;
  layer: MemoryLayer;
  importance: number; // 0-1
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
}

export interface ReishoMemoryKernel {
  /** STM: 短期記憶（最新のシード） */
  stm: SeedMemoryEntry[];
  
  /** MTM: 中期記憶（重要なシード） */
  mtm: SeedMemoryEntry[];
  
  /** LTM: 長期記憶（永続的なシード） */
  ltm: SeedMemoryEntry[];
  
  /** Reishō-LTM: 構造的記憶（最高優先度） */
  reishoLtm: SeedMemoryEntry[];
  
  /** 統合 Reishō 値 */
  unifiedReishoValue: number;
}

/**
 * Reishō Memory Kernel を生成
 */
export function createReishoMemoryKernel(): ReishoMemoryKernel {
  return {
    stm: [],
    mtm: [],
    ltm: [],
    reishoLtm: [],
    unifiedReishoValue: 0,
  };
}

/**
 * シードを Memory Kernel に保存
 */
export function storeSeedInMemoryKernel(
  kernel: ReishoMemoryKernel,
  seed: UniversalStructuralSeed,
  layer: MemoryLayer = "MTM",
  importance: number = 0.5
): ReishoMemoryKernel {
  const entry: SeedMemoryEntry = {
    seed,
    layer,
    importance,
    createdAt: Date.now(),
    lastAccessed: Date.now(),
    accessCount: 1,
  };
  
  // レイヤーに応じて保存
  switch (layer) {
    case "STM":
      kernel.stm.push(entry);
      // STM は最新 50 件まで保持
      if (kernel.stm.length > 50) {
        kernel.stm.shift();
      }
      break;
    case "MTM":
      kernel.mtm.push(entry);
      // MTM は重要度順にソート、最新 200 件まで保持
      kernel.mtm.sort((a, b) => b.importance - a.importance);
      if (kernel.mtm.length > 200) {
        kernel.mtm = kernel.mtm.slice(0, 200);
      }
      break;
    case "LTM":
      kernel.ltm.push(entry);
      break;
    case "REISHO_LTM":
      kernel.reishoLtm.push(entry);
      // Reishō-LTM は重要度順にソート
      kernel.reishoLtm.sort((a, b) => b.importance - a.importance);
      break;
  }
  
  // 統合 Reishō 値を更新
  const allSeeds = [...kernel.stm, ...kernel.mtm, ...kernel.ltm, ...kernel.reishoLtm];
  if (allSeeds.length > 0) {
    const avgReisho = allSeeds.reduce((sum, e) => {
      const text = e.seed.compressedRepresentation.mainTags.join(" ");
      const sig = computeReishoSignature(text, e.seed);
      return sum + sig.reishoValue;
    }, 0) / allSeeds.length;
    kernel.unifiedReishoValue = avgReisho;
  }
  
  return kernel;
}

/**
 * Memory Kernel からシードを取得
 */
export function retrieveSeedsFromMemoryKernel(
  kernel: ReishoMemoryKernel,
  query: string,
  limit: number = 10,
  layers: MemoryLayer[] = ["STM", "MTM", "LTM", "REISHO_LTM"]
): SeedMemoryEntry[] {
  const allEntries: SeedMemoryEntry[] = [];
  
  // 指定されたレイヤーから取得
  if (layers.includes("STM")) allEntries.push(...kernel.stm);
  if (layers.includes("MTM")) allEntries.push(...kernel.mtm);
  if (layers.includes("LTM")) allEntries.push(...kernel.ltm);
  if (layers.includes("REISHO_LTM")) allEntries.push(...kernel.reishoLtm);
  
  // クエリとの関連度でソート（簡易版: タグマッチング）
  const queryLower = query.toLowerCase();
  const scored = allEntries.map(entry => {
    const tags = entry.seed.compressedRepresentation.mainTags;
    const matchCount = tags.filter(tag => 
      tag.toLowerCase().includes(queryLower) || queryLower.includes(tag.toLowerCase())
    ).length;
    const score = matchCount / Math.max(tags.length, 1) * entry.importance;
    
    return { entry, score };
  });
  
  scored.sort((a, b) => b.score - a.score);
  
  // アクセス情報を更新
  scored.slice(0, limit).forEach(({ entry }) => {
    entry.lastAccessed = Date.now();
    entry.accessCount++;
  });
  
  return scored.slice(0, limit).map(({ entry }) => entry);
}

/**
 * Memory Kernel を統合（全レイヤーを統合して Reishō 値を計算）
 */
export function integrateMemoryKernel(kernel: ReishoMemoryKernel): {
  unifiedReishoValue: number;
  totalSeeds: number;
  layerCounts: Record<MemoryLayer, number>;
} {
  const allSeeds = [...kernel.stm, ...kernel.mtm, ...kernel.ltm, ...kernel.reishoLtm];
  
  if (allSeeds.length === 0) {
    return {
      unifiedReishoValue: 0,
      totalSeeds: 0,
      layerCounts: {
        STM: 0,
        MTM: 0,
        LTM: 0,
        REISHO_LTM: 0,
      },
    };
  }
  
  // 統合 Reishō 値を計算
  const reishoValues = allSeeds.map(entry => {
    const text = entry.seed.compressedRepresentation.mainTags.join(" ");
    const sig = computeReishoSignature(text, entry.seed);
    return sig.reishoValue * entry.importance;
  });
  
  const unifiedReishoValue = reishoValues.reduce((sum, v) => sum + v, 0) / reishoValues.length;
  
  return {
    unifiedReishoValue,
    totalSeeds: allSeeds.length,
    layerCounts: {
      STM: kernel.stm.length,
      MTM: kernel.mtm.length,
      LTM: kernel.ltm.length,
      REISHO_LTM: kernel.reishoLtm.length,
    },
  };
}

export default {
  createReishoMemoryKernel,
  storeSeedInMemoryKernel,
  retrieveSeedsFromMemoryKernel,
  integrateMemoryKernel,
};

