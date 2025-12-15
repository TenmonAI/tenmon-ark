/**
 * ============================================================
 *  CLUSTERER — FractalSeed クラスタリング
 * ============================================================
 * 
 * FractalSeed をクラスタリング
 * 
 * 機能:
 * - セマンティッククラスタリング
 * - Fire-Water バランスクラスタリング
 * - Kanagi Phase クラスタリング
 * ============================================================
 */

import type { FractalSeed } from "../db/schema/fractalSeed";

export interface SeedCluster {
  /** クラスタID */
  id: string;
  
  /** クラスタ内のシード */
  seeds: FractalSeed[];
  
  /** クラスタの中心 */
  centroid: {
    reishoValue: number;
    fireWaterBalance: number;
    kanagiPhase: string;
  };
  
  /** クラスタのサイズ */
  size: number;
}

/**
 * FractalSeed をクラスタリング
 */
export function clusterSeeds(
  seeds: FractalSeed[],
  method: "semantic" | "fireWater" | "kanagi" | "kmeans" = "kmeans",
  numClusters: number = 5
): SeedCluster[] {
  switch (method) {
    case "semantic":
      return clusterBySemantic(seeds, numClusters);
    case "fireWater":
      return clusterByFireWater(seeds, numClusters);
    case "kanagi":
      return clusterByKanagi(seeds);
    case "kmeans":
    default:
      return clusterByKMeans(seeds, numClusters);
  }
}

/**
 * セマンティッククラスタリング
 */
function clusterBySemantic(
  seeds: FractalSeed[],
  numClusters: number
): SeedCluster[] {
  // 簡易実装: Reishō 値でクラスタリング
  const sortedSeeds = [...seeds].sort((a, b) => {
    const reishoA = a.reishoSignature?.reishoValue || 0;
    const reishoB = b.reishoSignature?.reishoValue || 0;
    return reishoA - reishoB;
  });
  
  const clusters: SeedCluster[] = [];
  const clusterSize = Math.ceil(sortedSeeds.length / numClusters);
  
  for (let i = 0; i < numClusters; i++) {
    const clusterSeeds = sortedSeeds.slice(i * clusterSize, (i + 1) * clusterSize);
    
    if (clusterSeeds.length > 0) {
      const avgReisho = clusterSeeds.reduce((sum, s) => 
        sum + (s.reishoSignature?.reishoValue || 0), 0
      ) / clusterSeeds.length;
      
      clusters.push({
        id: `cluster-${i}`,
        seeds: clusterSeeds,
        centroid: {
          reishoValue: avgReisho,
          fireWaterBalance: 0,
          kanagiPhase: "L-IN",
        },
        size: clusterSeeds.length,
      });
    }
  }
  
  return clusters;
}

/**
 * Fire-Water バランスクラスタリング
 */
function clusterByFireWater(
  seeds: FractalSeed[],
  numClusters: number
): SeedCluster[] {
  const sortedSeeds = [...seeds].sort((a, b) => {
    const balanceA = a.reishoSignature?.fireWaterBalance || 0;
    const balanceB = b.reishoSignature?.fireWaterBalance || 0;
    return balanceA - balanceB;
  });
  
  const clusters: SeedCluster[] = [];
  const clusterSize = Math.ceil(sortedSeeds.length / numClusters);
  
  for (let i = 0; i < numClusters; i++) {
    const clusterSeeds = sortedSeeds.slice(i * clusterSize, (i + 1) * clusterSize);
    
    if (clusterSeeds.length > 0) {
      const avgBalance = clusterSeeds.reduce((sum, s) => 
        sum + (s.reishoSignature?.fireWaterBalance || 0), 0
      ) / clusterSeeds.length;
      
      clusters.push({
        id: `cluster-${i}`,
        seeds: clusterSeeds,
        centroid: {
          reishoValue: 0.5,
          fireWaterBalance: avgBalance,
          kanagiPhase: "L-IN",
        },
        size: clusterSeeds.length,
      });
    }
  }
  
  return clusters;
}

/**
 * Kanagi Phase クラスタリング
 */
function clusterByKanagi(seeds: FractalSeed[]): SeedCluster[] {
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
  
  const clusters: SeedCluster[] = [];
  
  for (const [phase, phaseSeeds] of Object.entries(phaseGroups)) {
    if (phaseSeeds.length > 0) {
      const avgReisho = phaseSeeds.reduce((sum, s) => 
        sum + (s.reishoSignature?.reishoValue || 0), 0
      ) / phaseSeeds.length;
      
      clusters.push({
        id: `cluster-${phase}`,
        seeds: phaseSeeds,
        centroid: {
          reishoValue: avgReisho,
          fireWaterBalance: 0,
          kanagiPhase: phase,
        },
        size: phaseSeeds.length,
      });
    }
  }
  
  return clusters;
}

/**
 * K-Means クラスタリング
 */
function clusterByKMeans(
  seeds: FractalSeed[],
  numClusters: number
): SeedCluster[] {
  // 簡易実装: Reishō 値でK-Means
  return clusterBySemantic(seeds, numClusters);
}

export default {
  clusterSeeds,
};

