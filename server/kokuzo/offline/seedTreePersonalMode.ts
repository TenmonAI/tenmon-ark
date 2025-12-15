/**
 * ============================================================
 *  SEED TREE PERSONAL MODE — SeedTree Personal Mode
 * ============================================================
 * 
 * オフライン時の SeedTree 構築（パーソナルモード）
 * ============================================================
 */

import type { LocalSeed } from "../offline/localKokuzoKernel";

export interface SeedTree {
  roots: string[]; // Root seed IDs
  nodes: Map<string, SeedTreeNode>;
  edges: Array<{ from: string; to: string; weight: number }>;
}

export interface SeedTreeNode {
  id: string;
  seed: LocalSeed;
  children: string[];
  parents: string[];
  depth: number;
}

/**
 * パーソナルモードで SeedTree を構築
 */
export async function buildSeedTreePersonalMode(
  seeds: LocalSeed[],
  isOffline: boolean
): Promise<SeedTree> {
  if (isOffline) {
    // オフライン時: グローバル再クラスタリングを禁止
    return buildPersonalSeedTree(seeds);
  } else {
    // オンライン時: 通常の SeedTree 構築
    return buildGlobalSeedTree(seeds);
  }
}

/**
 * パーソナル SeedTree を構築（Semantic/FireWater/Phase クラスタリングのみ）
 */
function buildPersonalSeedTree(seeds: LocalSeed[]): SeedTree {
  const nodes = new Map<string, SeedTreeNode>();
  const edges: Array<{ from: string; to: string; weight: number }> = [];
  const roots: string[] = [];

  // 1. 各 Seed をノードとして追加
  for (const seed of seeds) {
    nodes.set(seed.id, {
      id: seed.id,
      seed,
      children: [],
      parents: [],
      depth: 0,
    });
  }

  // 2. Semantic 類似度でエッジを追加
  for (let i = 0; i < seeds.length; i++) {
    for (let j = i + 1; j < seeds.length; j++) {
      const similarity = computeSemanticSimilarity(seeds[i], seeds[j]);
      
      if (similarity > 0.7) {
        edges.push({
          from: seeds[i].id,
          to: seeds[j].id,
          weight: similarity,
        });

        const nodeI = nodes.get(seeds[i].id)!;
        const nodeJ = nodes.get(seeds[j].id)!;

        nodeI.children.push(seeds[j].id);
        nodeJ.parents.push(seeds[i].id);
      }
    }
  }

  // 3. Fire-Water バランスでクラスタリング
  const fireWaterClusters = clusterByFireWaterBalance(seeds);
  
  // 4. Kanagi Phase でクラスタリング
  const kanagiClusters = clusterByKanagiPhase(seeds);

  // 5. Root ノードを決定（親がないノード）
  for (const [id, node] of nodes) {
    if (node.parents.length === 0) {
      roots.push(id);
    }
  }

  return {
    roots,
    nodes,
    edges,
  };
}

/**
 * グローバル SeedTree を構築（再クラスタリング許可）
 */
function buildGlobalSeedTree(seeds: LocalSeed[]): SeedTree {
  // 実際の実装では、グローバル再クラスタリングを実行
  // ここではパーソナル SeedTree と同じロジックを使用
  return buildPersonalSeedTree(seeds);
}

/**
 * Semantic 類似度を計算
 */
function computeSemanticSimilarity(seed1: LocalSeed, seed2: LocalSeed): number {
  // 簡単な類似度計算（実際の実装ではより高度な処理）
  const tags1 = seed1.compressedRepresentation.mainTags || [];
  const tags2 = seed2.compressedRepresentation.mainTags || [];
  
  const intersection = tags1.filter((t) => tags2.includes(t));
  const union = [...new Set([...tags1, ...tags2])];
  
  return union.length > 0 ? intersection.length / union.length : 0;
}

/**
 * Fire-Water バランスでクラスタリング
 */
function clusterByFireWaterBalance(seeds: LocalSeed[]): Map<string, LocalSeed[]> {
  const clusters = new Map<string, LocalSeed[]>();

  for (const seed of seeds) {
    const fwBalance = seed.compressedRepresentation.fireWaterBalance || 0.5;
    const clusterKey = fwBalance > 0.6 ? "fire" : fwBalance < 0.4 ? "water" : "balanced";

    if (!clusters.has(clusterKey)) {
      clusters.set(clusterKey, []);
    }
    clusters.get(clusterKey)!.push(seed);
  }

  return clusters;
}

/**
 * Kanagi Phase でクラスタリング
 */
function clusterByKanagiPhase(seeds: LocalSeed[]): Map<string, LocalSeed[]> {
  const clusters = new Map<string, LocalSeed[]>();

  for (const seed of seeds) {
    const phase = seed.compressedRepresentation.kanagiPhaseMode || "L-IN";

    if (!clusters.has(phase)) {
      clusters.set(phase, []);
    }
    clusters.get(phase)!.push(seed);
  }

  return clusters;
}

export default {
  buildSeedTreePersonalMode,
  buildPersonalSeedTree,
  buildGlobalSeedTree,
};

