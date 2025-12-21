// 螺旋状態管理 (Spiral State)
// セッションごとの螺旋深度と種子をメモリ上に保持するストア

import type { KanagiSpiral } from "../types/spiral.js";

/**
 * セッションごとの螺旋状態（In-Memory）
 * 
 * ※ 将来的にはRedis/DBへ移行可能だが、まずはメモリで実装
 */
const spiralStore = new Map<string, KanagiSpiral>();

/**
 * 螺旋状態を取得
 */
export function getSpiral(sessionId: string): KanagiSpiral | null {
  return spiralStore.get(sessionId) ?? null;
}

/**
 * 螺旋状態を設定
 */
export function setSpiral(sessionId: string, spiral: KanagiSpiral): void {
  spiralStore.set(sessionId, spiral);
  console.log(`[KANAGI-SPIRAL] State saved for session ${sessionId}, depth: ${spiral.depth}`);
}

/**
 * 螺旋状態をクリア
 */
export function clearSpiral(sessionId: string): void {
  spiralStore.delete(sessionId);
  console.log(`[KANAGI-SPIRAL] State cleared for session ${sessionId}`);
}

