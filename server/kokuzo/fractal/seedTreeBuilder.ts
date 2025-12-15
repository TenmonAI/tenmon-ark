/**
 * ============================================================
 *  SEED TREE BUILDER — FractalSeed Tree Construction
 * ============================================================
 * 
 * Semantic + FireWater + Kanagi に基づいて FractalSeed Tree を構築
 * 
 * 機能:
 * - セマンティック親和性によるクラスタリング
 * - Fire-Water バランスによるクラスタリング
 * - Kanagi Phase によるクラスタリング
 * ============================================================
 */

import type { FractalSeed } from "../db/schema/fractalSeed";
import type { SemanticUnit } from "../db/schema/semanticUnit";
import { cosineSimilarity } from "./utils";

export interface SeedTreeNode {
  /** ノードID */
  id: string;
  
  /** FractalSeed */
  seed: FractalSeed;
  
  /** 子ノード */
  children: SeedTreeNode[];
  
  /** 親ノードID */
  parentId: string | null;
  
  /** 深さ */
  depth: number;
  
  /** セマンティック親和性スコア */
  semanticAffinity: number;
  
  /** Fire-Water バランス */
  fireWaterBalance: number;
  
  /** Kanagi Phase */
  kanagiPhase: string;
}

/**
 * FractalSeed Tree を構築
 */
export function buildSeedTree(
  seeds: FractalSeed[],
  options: {
    maxDepth?: number;
    minAffinity?: number;
    clusteringMethod?: "semantic" | "fireWater" | "kanagi" | "hybrid";
  } = {}
): SeedTreeNode[] {
  const {
    maxDepth = 5,
    minAffinity = 0.3,
    clusteringMethod = "hybrid",
  } = options;
  
  // ルートノードを作成
  const rootNodes: SeedTreeNode[] = [];
  
  // クラスタリング方法に応じてツリーを構築
  switch (clusteringMethod) {
    case "semantic":
      return buildTreeBySemanticAffinity(seeds, maxDepth, minAffinity);
    case "fireWater":
      return buildTreeByFireWaterBalance(seeds, maxDepth, minAffinity);
    case "kanagi":
      return buildTreeByKanagiPhase(seeds, maxDepth, minAffinity);
    case "hybrid":
    default:
      return buildTreeByHybrid(seeds, maxDepth, minAffinity);
  }
}

/**
 * セマンティック親和性によるツリー構築
 */
function buildTreeBySemanticAffinity(
  seeds: FractalSeed[],
  maxDepth: number,
  minAffinity: number
): SeedTreeNode[] {
  const nodes: SeedTreeNode[] = [];
  
  // 各シードをノードに変換
  for (const seed of seeds) {
    const node: SeedTreeNode = {
      id: seed.id,
      seed,
      children: [],
      parentId: null,
      depth: 0,
      semanticAffinity: 0,
      fireWaterBalance: seed.reishoSignature?.fireWaterBalance || 0,
      kanagiPhase: seed.reishoSignature?.kanagiPhase || "L-IN",
    };
    nodes.push(node);
  }
  
  // セマンティック親和性を計算してツリーを構築
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const affinity = calculateSemanticAffinity(nodes[i].seed, nodes[j].seed);
      
      if (affinity >= minAffinity && nodes[j].depth < maxDepth) {
        // 親子関係を確立
        if (nodes[i].depth <= nodes[j].depth) {
          nodes[i].children.push(nodes[j]);
          nodes[j].parentId = nodes[i].id;
          nodes[j].depth = nodes[i].depth + 1;
          nodes[j].semanticAffinity = affinity;
        }
      }
    }
  }
  
  // ルートノードを返す（親がないノード）
  return nodes.filter(n => n.parentId === null);
}

/**
 * Fire-Water バランスによるツリー構築
 */
function buildTreeByFireWaterBalance(
  seeds: FractalSeed[],
  maxDepth: number,
  minAffinity: number
): SeedTreeNode[] {
  const nodes: SeedTreeNode[] = [];
  
  // Fire-Water バランスでソート
  const sortedSeeds = [...seeds].sort((a, b) => {
    const balanceA = a.reishoSignature?.fireWaterBalance || 0;
    const balanceB = b.reishoSignature?.fireWaterBalance || 0;
    return balanceA - balanceB;
  });
  
  // 各シードをノードに変換
  for (const seed of sortedSeeds) {
    const node: SeedTreeNode = {
      id: seed.id,
      seed,
      children: [],
      parentId: null,
      depth: 0,
      semanticAffinity: 0,
      fireWaterBalance: seed.reishoSignature?.fireWaterBalance || 0,
      kanagiPhase: seed.reishoSignature?.kanagiPhase || "L-IN",
    };
    nodes.push(node);
  }
  
  // Fire-Water バランスに基づいてツリーを構築
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const balanceDiff = Math.abs(nodes[i].fireWaterBalance - nodes[j].fireWaterBalance);
      
      if (balanceDiff <= (1 - minAffinity) && nodes[j].depth < maxDepth) {
        // 親子関係を確立
        if (nodes[i].depth <= nodes[j].depth) {
          nodes[i].children.push(nodes[j]);
          nodes[j].parentId = nodes[i].id;
          nodes[j].depth = nodes[i].depth + 1;
          nodes[j].semanticAffinity = 1 - balanceDiff;
        }
      }
    }
  }
  
  // ルートノードを返す
  return nodes.filter(n => n.parentId === null);
}

/**
 * Kanagi Phase によるツリー構築
 */
function buildTreeByKanagiPhase(
  seeds: FractalSeed[],
  maxDepth: number,
  minAffinity: number
): SeedTreeNode[] {
  const nodes: SeedTreeNode[] = [];
  
  // Kanagi Phase でグループ化
  const phaseGroups: Record<string, FractalSeed[]> = {
    "L-IN": [],
    "L-OUT": [],
    "R-IN": [],
    "R-OUT": [],
  };
  
  for (const seed of seeds) {
    const phase = seed.reishoSignature?.kanagiPhase || "L-IN";
    if (phaseGroups[phase]) {
      phaseGroups[phase].push(seed);
    }
  }
  
  // 各フェーズグループ内でツリーを構築
  for (const [phase, phaseSeeds] of Object.entries(phaseGroups)) {
    for (const seed of phaseSeeds) {
      const node: SeedTreeNode = {
        id: seed.id,
        seed,
        children: [],
        parentId: null,
        depth: 0,
        semanticAffinity: 0,
        fireWaterBalance: seed.reishoSignature?.fireWaterBalance || 0,
        kanagiPhase: phase,
      };
      nodes.push(node);
    }
  }
  
  // 同じフェーズ内でツリーを構築
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[i].kanagiPhase === nodes[j].kanagiPhase && nodes[j].depth < maxDepth) {
        const affinity = calculateSemanticAffinity(nodes[i].seed, nodes[j].seed);
        
        if (affinity >= minAffinity) {
          // 親子関係を確立
          if (nodes[i].depth <= nodes[j].depth) {
            nodes[i].children.push(nodes[j]);
            nodes[j].parentId = nodes[i].id;
            nodes[j].depth = nodes[i].depth + 1;
            nodes[j].semanticAffinity = affinity;
          }
        }
      }
    }
  }
  
  // ルートノードを返す
  return nodes.filter(n => n.parentId === null);
}

/**
 * ハイブリッド方法によるツリー構築
 */
function buildTreeByHybrid(
  seeds: FractalSeed[],
  maxDepth: number,
  minAffinity: number
): SeedTreeNode[] {
  // セマンティック + Fire-Water + Kanagi を統合
  const semanticTree = buildTreeBySemanticAffinity(seeds, maxDepth, minAffinity);
  const fireWaterTree = buildTreeByFireWaterBalance(seeds, maxDepth, minAffinity);
  const kanagiTree = buildTreeByKanagiPhase(seeds, maxDepth, minAffinity);
  
  // ツリーをマージ（簡易版）
  return semanticTree; // 実際の実装では、より高度なマージロジックを実装
}

/**
 * セマンティック親和性を計算
 */
function calculateSemanticAffinity(
  seed1: FractalSeed,
  seed2: FractalSeed
): number {
  // メインタグの重複を計算
  const tags1 = seed1.compressedRepresentation.mainTags || [];
  const tags2 = seed2.compressedRepresentation.mainTags || [];
  
  const commonTags = tags1.filter(tag => tags2.includes(tag));
  const tagSimilarity = commonTags.length / Math.max(tags1.length, tags2.length, 1);
  
  // Reishō 値の類似性を計算
  const reisho1 = seed1.reishoSignature?.reishoValue || 0;
  const reisho2 = seed2.reishoSignature?.reishoValue || 0;
  const reishoSimilarity = 1 - Math.abs(reisho1 - reisho2);
  
  // 統合親和性
  return (tagSimilarity * 0.6 + reishoSimilarity * 0.4);
}

export default {
  buildSeedTree,
};

