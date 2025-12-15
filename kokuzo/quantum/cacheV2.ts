/**
 * Quantum Cache v2
 * - activationLevel に応じて Memory/Seed を保持
 */

export interface QuantumCacheEntry {
  id: string;
  type: "semantic" | "seed";
  lastAccess: number;
  activationLevel: number;
  data?: any; // キャッシュされたデータ
}

const cache = new Map<string, QuantumCacheEntry>();

/**
 * キャッシュエントリにアクセス（活性化レベルを上げる）
 */
export function touch(id: string, type: "semantic" | "seed" = "semantic"): void {
  const now = Date.now();
  const entry = cache.get(id) || { 
    id, 
    type, 
    lastAccess: now, 
    activationLevel: 0,
    data: undefined,
  };
  entry.lastAccess = now;
  entry.activationLevel = Math.min(1.0, entry.activationLevel + 0.1);
  cache.set(id, entry);
}

/**
 * キャッシュエントリを取得
 */
export function get(id: string): QuantumCacheEntry | undefined {
  return cache.get(id);
}

/**
 * キャッシュエントリを設定
 */
export function set(id: string, data: any, type: "semantic" | "seed" = "semantic"): void {
  const now = Date.now();
  cache.set(id, {
    id,
    type,
    lastAccess: now,
    activationLevel: 0.5, // 新規エントリは中程度の活性化レベル
    data,
  });
}

/**
 * 低活性化レベルのエントリを削除（ガベージコレクション）
 */
export function gc(threshold: number = 0.1): number {
  let removed = 0;
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24時間
  
  for (const [id, entry] of cache.entries()) {
    const age = now - entry.lastAccess;
    if (entry.activationLevel < threshold || age > maxAge) {
      cache.delete(id);
      removed++;
    }
  }
  
  return removed;
}

/**
 * キャッシュ統計を取得
 */
export function getStats(): {
  total: number;
  semantic: number;
  seed: number;
  averageActivation: number;
} {
  let total = 0;
  let semantic = 0;
  let seed = 0;
  let totalActivation = 0;
  
  for (const entry of cache.values()) {
    total++;
    if (entry.type === "semantic") {
      semantic++;
    } else {
      seed++;
    }
    totalActivation += entry.activationLevel;
  }
  
  return {
    total,
    semantic,
    seed,
    averageActivation: total > 0 ? totalActivation / total : 0,
  };
}

