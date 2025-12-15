/**
 * ============================================================
 *  MEMORY KERNEL V2 — 物理化 Memory Kernel
 * ============================================================
 * 
 * Memory Kernel v2 を Kokūzō Server に物理化（永続層）
 * 
 * 機能:
 * - STM/MTM/LTM/Reishō-LTM の永続化
 * - シードベースメモリの永続化
 * - 永続化アダプターとの統合
 * ============================================================
 */

import type { ReishoMemoryKernel } from "../../reisho/memoryKernelV2";
import { createReishoMemoryKernel } from "../../reisho/memoryKernelV2";
import { persistMemoryKernel, loadMemoryKernel } from "./persistenceAdapter";
import type { UniversalStructuralSeed } from "../fractal/seedV2";

export interface PhysicalizedMemoryKernel {
  /** Memory Kernel ID */
  id: string;
  
  /** Memory Kernel データ */
  kernel: ReishoMemoryKernel;
  
  /** 永続化状態 */
  persisted: boolean;
  
  /** 最後の永続化日時 */
  lastPersistedAt: number;
}

/**
 * Memory Kernel v2 を物理化
 */
export async function physicalizeMemoryKernel(
  userId: string,
  kernel?: ReishoMemoryKernel
): Promise<PhysicalizedMemoryKernel> {
  // 既存の Kernel を読み込むか、新規作成
  let memoryKernel = kernel;
  
  if (!memoryKernel) {
    const loaded = await loadMemoryKernel(userId);
    if (loaded) {
      memoryKernel = loaded;
    } else {
      memoryKernel = createReishoMemoryKernel();
    }
  }
  
  // 永続化
  await persistMemoryKernel(userId, memoryKernel);
  
  return {
    id: `memory-kernel-${userId}`,
    kernel: memoryKernel,
    persisted: true,
    lastPersistedAt: Date.now(),
  };
}

/**
 * Memory Kernel v2 を読み込み
 */
export async function loadPhysicalizedMemoryKernel(
  userId: string
): Promise<PhysicalizedMemoryKernel | null> {
  const kernel = await loadMemoryKernel(userId);
  
  if (!kernel) {
    return null;
  }
  
  return {
    id: `memory-kernel-${userId}`,
    kernel,
    persisted: true,
    lastPersistedAt: Date.now(),
  };
}

/**
 * Memory Kernel v2 を更新
 */
export async function updatePhysicalizedMemoryKernel(
  userId: string,
  updates: Partial<ReishoMemoryKernel>
): Promise<PhysicalizedMemoryKernel> {
  const physicalized = await loadPhysicalizedMemoryKernel(userId);
  
  if (!physicalized) {
    // 新規作成
    return await physicalizeMemoryKernel(userId);
  }
  
  // 更新を適用
  const updatedKernel: ReishoMemoryKernel = {
    ...physicalized.kernel,
    ...updates,
  };
  
  // 永続化
  await persistMemoryKernel(userId, updatedKernel);
  
  return {
    ...physicalized,
    kernel: updatedKernel,
    lastPersistedAt: Date.now(),
  };
}

export default {
  physicalizeMemoryKernel,
  loadPhysicalizedMemoryKernel,
  updatePhysicalizedMemoryKernel,
};

