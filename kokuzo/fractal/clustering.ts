/**
 * 🔱 KOKŪZŌ Fractal Engine — クラスタリング
 * SemanticUnit → FractalCluster の生成（数学的クラスタリング）
 */

import type { SemanticUnit } from "../semantic/engine";
import { averageEmbedding } from "../semantic/engine";
import { cosineSimilarity } from "./utils";

export interface FractalCluster {
  id: string;
  units: SemanticUnit[];
  centroid: number[];
  kotodamaCentroid: {
    vowelVector: number[];
    consonantVector: number[];
    fire: number;
    water: number;
    balance: number;
  };
  kanagiPhase: "L-IN" | "L-OUT" | "R-IN" | "R-OUT";
  mainTags: string[];
  createdAt: number;
}

/**
 * セマンティック類似度によるクラスタリング
 */
export function clusterBySemanticAffinity(
  units: SemanticUnit[],
  threshold: number = 0.7
): FractalCluster[] {
  const clusters: FractalCluster[] = [];
  const assigned = new Set<string>();
  
  for (const unit of units) {
    if (assigned.has(unit.id)) continue;
    
    // 新しいクラスタを作成
    const cluster: FractalCluster = {
      id: crypto.randomUUID(),
      units: [unit],
      centroid: unit.embedding || [],
      kotodamaCentroid: unit.kotodamaSignature
        ? {
            vowelVector: unit.kotodamaSignature.vowelVector,
            consonantVector: unit.kotodamaSignature.consonantVector,
            fire: unit.kotodamaSignature.fire,
            water: unit.kotodamaSignature.water,
            balance: unit.kotodamaSignature.balance,
          }
        : {
            vowelVector: [0, 0, 0, 0, 0],
            consonantVector: [0, 0, 0, 0, 0, 0, 0, 0, 0],
            fire: 0,
            water: 0,
            balance: 0,
          },
      kanagiPhase: unit.amatsuKanagiPhase || "L-IN",
      mainTags: [...unit.tags],
      createdAt: Date.now(),
    };
    
    assigned.add(unit.id);
    
    // 類似するユニットを追加
    for (const otherUnit of units) {
      if (assigned.has(otherUnit.id)) continue;
      if (!unit.embedding || !otherUnit.embedding) continue;
      
      const similarity = cosineSimilarity(unit.embedding, otherUnit.embedding);
      if (similarity >= threshold) {
        cluster.units.push(otherUnit);
        assigned.add(otherUnit.id);
      }
    }
    
    // クラスタの centroid を再計算
    const embeddings = cluster.units
      .map(u => u.embedding)
      .filter((e): e is number[] => e !== undefined && e.length > 0);
    
    if (embeddings.length > 0) {
      cluster.centroid = averageEmbedding(embeddings);
    }
    
    // タグを集約
    const tagCounts: Record<string, number> = {};
    for (const u of cluster.units) {
      for (const tag of u.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    cluster.mainTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
    
    clusters.push(cluster);
  }
  
  return clusters;
}

/**
 * 火水バランスによるクラスタリング
 */
export function clusterByFireWaterBalance(
  units: SemanticUnit[],
  threshold: number = 0.2
): FractalCluster[] {
  const clusters: FractalCluster[] = [];
  const assigned = new Set<string>();
  
  for (const unit of units) {
    if (assigned.has(unit.id)) continue;
    if (!unit.kotodamaSignature) continue;
    
    const { fire, water, balance } = unit.kotodamaSignature;
    
    // 新しいクラスタを作成
    const cluster: FractalCluster = {
      id: crypto.randomUUID(),
      units: [unit],
      centroid: unit.embedding || [],
      kotodamaCentroid: {
        vowelVector: unit.kotodamaSignature.vowelVector,
        consonantVector: unit.kotodamaSignature.consonantVector,
        fire,
        water,
        balance,
      },
      kanagiPhase: unit.amatsuKanagiPhase || "L-IN",
      mainTags: [...unit.tags],
      createdAt: Date.now(),
    };
    
    assigned.add(unit.id);
    
    // 類似する火水バランスのユニットを追加
    for (const otherUnit of units) {
      if (assigned.has(otherUnit.id)) continue;
      if (!otherUnit.kotodamaSignature) continue;
      
      const otherBalance = otherUnit.kotodamaSignature.balance;
      if (Math.abs(balance - otherBalance) <= threshold) {
        cluster.units.push(otherUnit);
        assigned.add(otherUnit.id);
      }
    }
    
    // クラスタの centroid を再計算
    const embeddings = cluster.units
      .map(u => u.embedding)
      .filter((e): e is number[] => e !== undefined && e.length > 0);
    
    if (embeddings.length > 0) {
      cluster.centroid = averageEmbedding(embeddings);
    }
    
    // タグを集約
    const tagCounts: Record<string, number> = {};
    for (const u of cluster.units) {
      for (const tag of u.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    cluster.mainTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
    
    clusters.push(cluster);
  }
  
  return clusters;
}

/**
 * 天津金木フェーズによるクラスタリング
 */
export function clusterByKanagiPhase(units: SemanticUnit[]): FractalCluster[] {
  const phaseMap = new Map<"L-IN" | "L-OUT" | "R-IN" | "R-OUT", SemanticUnit[]>();
  
  for (const unit of units) {
    const phase = unit.amatsuKanagiPhase || "L-IN";
    if (!phaseMap.has(phase)) {
      phaseMap.set(phase, []);
    }
    phaseMap.get(phase)!.push(unit);
  }
  
  const clusters: FractalCluster[] = [];
  
  for (const [phase, phaseUnits] of phaseMap.entries()) {
    if (phaseUnits.length === 0) continue;
    
    // クラスタの centroid を計算
    const embeddings = phaseUnits
      .map(u => u.embedding)
      .filter((e): e is number[] => e !== undefined && e.length > 0);
    
    const centroid = embeddings.length > 0 ? averageEmbedding(embeddings) : [];
    
    // Kotodama centroid を計算
    const kotodamaCentroid = {
      vowelVector: [0, 0, 0, 0, 0] as number[],
      consonantVector: [0, 0, 0, 0, 0, 0, 0, 0, 0] as number[],
      fire: 0,
      water: 0,
      balance: 0,
    };
    
    for (const unit of phaseUnits) {
      if (unit.kotodamaSignature) {
        for (let i = 0; i < 5; i++) {
          kotodamaCentroid.vowelVector[i] += unit.kotodamaSignature.vowelVector[i];
        }
        for (let i = 0; i < 9; i++) {
          kotodamaCentroid.consonantVector[i] += unit.kotodamaSignature.consonantVector[i];
        }
        kotodamaCentroid.fire += unit.kotodamaSignature.fire;
        kotodamaCentroid.water += unit.kotodamaSignature.water;
        kotodamaCentroid.balance += unit.kotodamaSignature.balance;
      }
    }
    
    const count = phaseUnits.length;
    if (count > 0) {
      for (let i = 0; i < 5; i++) {
        kotodamaCentroid.vowelVector[i] /= count;
      }
      for (let i = 0; i < 9; i++) {
        kotodamaCentroid.consonantVector[i] /= count;
      }
      kotodamaCentroid.fire /= count;
      kotodamaCentroid.water /= count;
      kotodamaCentroid.balance /= count;
    }
    
    // タグを集約
    const tagCounts: Record<string, number> = {};
    for (const unit of phaseUnits) {
      for (const tag of unit.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    const mainTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
    
    clusters.push({
      id: crypto.randomUUID(),
      units: phaseUnits,
      centroid,
      kotodamaCentroid,
      kanagiPhase: phase,
      mainTags,
      createdAt: Date.now(),
    });
  }
  
  return clusters;
}

/**
 * キーワードグラフによるクラスタリング
 */
export function clusterByKeywordGraph(
  units: SemanticUnit[],
  minSharedTags: number = 2
): FractalCluster[] {
  const clusters: FractalCluster[] = [];
  const assigned = new Set<string>();
  
  for (const unit of units) {
    if (assigned.has(unit.id)) continue;
    
    // 新しいクラスタを作成
    const cluster: FractalCluster = {
      id: crypto.randomUUID(),
      units: [unit],
      centroid: unit.embedding || [],
      kotodamaCentroid: unit.kotodamaSignature
        ? {
            vowelVector: unit.kotodamaSignature.vowelVector,
            consonantVector: unit.kotodamaSignature.consonantVector,
            fire: unit.kotodamaSignature.fire,
            water: unit.kotodamaSignature.water,
            balance: unit.kotodamaSignature.balance,
          }
        : {
            vowelVector: [0, 0, 0, 0, 0],
            consonantVector: [0, 0, 0, 0, 0, 0, 0, 0, 0],
            fire: 0,
            water: 0,
            balance: 0,
          },
      kanagiPhase: unit.amatsuKanagiPhase || "L-IN",
      mainTags: [...unit.tags],
      createdAt: Date.now(),
    };
    
    assigned.add(unit.id);
    
    // 共通タグを持つユニットを追加
    for (const otherUnit of units) {
      if (assigned.has(otherUnit.id)) continue;
      
      const sharedTags = unit.tags.filter(tag => otherUnit.tags.includes(tag));
      if (sharedTags.length >= minSharedTags) {
        cluster.units.push(otherUnit);
        assigned.add(otherUnit.id);
      }
    }
    
    // クラスタの centroid を再計算
    const embeddings = cluster.units
      .map(u => u.embedding)
      .filter((e): e is number[] => e !== undefined && e.length > 0);
    
    if (embeddings.length > 0) {
      cluster.centroid = averageEmbedding(embeddings);
    }
    
    // タグを集約
    const tagCounts: Record<string, number> = {};
    for (const u of cluster.units) {
      for (const tag of u.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    cluster.mainTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
    
    clusters.push(cluster);
  }
  
  return clusters;
}

