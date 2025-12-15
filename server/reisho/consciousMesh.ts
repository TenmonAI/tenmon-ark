/**
 * ============================================================
 *  CONSCIOUS MESH — DeviceCluster の昇格
 * ============================================================
 * 
 * DeviceCluster を Conscious Mesh に昇格
 * デバイスが Reishō を通じて意識的に接続される
 * 
 * アーキテクチャ:
 * - 各デバイスが Reishō Node として機能
 * - Reishō シグネチャでデバイス間の親和性を計算
 * - 意識的なタスク分散と同期
 * ============================================================
 */

import type { DeviceNode } from "../../kokuzo/device/fusion";
import { computeReishoSignature } from "./reishoKernel";
import { routeTaskUsingReishoAffinity } from "../../kokuzo/fractal/deviceClusterIntegration";
import type { UniversalStructuralSeed } from "../../kokuzo/fractal/seedV2";

export interface ConsciousNode {
  device: DeviceNode;
  reishoSignature: any;
  consciousnessLevel: number; // 0-1
  affinityMap: Record<string, number>; // 他のノードとの親和性
  lastSync: number;
}

export interface ConsciousMesh {
  nodes: ConsciousNode[];
  unifiedReishoValue: number;
  meshCoherence: number; // 0-1
  lastSync: number;
}

/**
 * Conscious Mesh を生成
 */
export function createConsciousMesh(devices: DeviceNode[]): ConsciousMesh {
  const nodes: ConsciousNode[] = devices.map(device => ({
    device,
    reishoSignature: computeReishoSignature(device.name || device.id),
    consciousnessLevel: 0.5, // 初期値
    affinityMap: {},
    lastSync: Date.now(),
  }));
  
  // ノード間の親和性を計算
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const affinity = computeNodeAffinity(nodes[i], nodes[j]);
      nodes[i].affinityMap[nodes[j].device.id] = affinity;
      nodes[j].affinityMap[nodes[i].device.id] = affinity;
    }
  }
  
  // 統合 Reishō 値を計算
  const unifiedReishoValue = nodes.reduce((sum, node) => 
    sum + node.reishoSignature.reishoValue, 0
  ) / nodes.length;
  
  // Mesh Coherence を計算
  const meshCoherence = computeMeshCoherence(nodes);
  
  return {
    nodes,
    unifiedReishoValue,
    meshCoherence,
    lastSync: Date.now(),
  };
}

/**
 * ノード間の親和性を計算
 */
function computeNodeAffinity(node1: ConsciousNode, node2: ConsciousNode): number {
  // Reishō シグネチャの類似度を計算（簡易版）
  const sig1 = node1.reishoSignature.unifiedFireWaterTensor;
  const sig2 = node2.reishoSignature.unifiedFireWaterTensor;
  
  if (sig1.length !== sig2.length) return 0;
  
  // コサイン類似度
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < sig1.length; i++) {
    dotProduct += sig1[i] * sig2[i];
    norm1 += sig1[i] * sig1[i];
    norm2 += sig2[i] * sig2[i];
  }
  
  const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2) + 1e-10);
  return Math.max(0, Math.min(1, similarity));
}

/**
 * Mesh Coherence を計算
 */
function computeMeshCoherence(nodes: ConsciousNode[]): number {
  if (nodes.length < 2) return 1;
  
  let totalAffinity = 0;
  let pairCount = 0;
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const affinity = nodes[i].affinityMap[nodes[j].device.id] || 0;
      totalAffinity += affinity;
      pairCount++;
    }
  }
  
  return pairCount > 0 ? totalAffinity / pairCount : 1;
}

/**
 * Conscious Mesh でタスクをルーティング
 */
export function routeTaskInConsciousMesh(
  mesh: ConsciousMesh,
  seed: UniversalStructuralSeed
): string {
  const devices = mesh.nodes.map(node => node.device);
  return routeTaskUsingReishoAffinity(seed, devices);
}

/**
 * Conscious Mesh を同期
 */
export function syncConsciousMesh(mesh: ConsciousMesh): ConsciousMesh {
  // 各ノードの意識レベルを更新
  const updatedNodes = mesh.nodes.map(node => ({
    ...node,
    consciousnessLevel: Math.min(1, node.consciousnessLevel * 0.95 + mesh.unifiedReishoValue * 0.05),
    lastSync: Date.now(),
  }));
  
  // 統合 Reishō 値を再計算
  const unifiedReishoValue = updatedNodes.reduce((sum, node) => 
    sum + node.reishoSignature.reishoValue, 0
  ) / updatedNodes.length;
  
  // Mesh Coherence を再計算
  const meshCoherence = computeMeshCoherence(updatedNodes);
  
  return {
    nodes: updatedNodes,
    unifiedReishoValue,
    meshCoherence,
    lastSync: Date.now(),
  };
}

export default {
  createConsciousMesh,
  routeTaskInConsciousMesh,
  syncConsciousMesh,
};

