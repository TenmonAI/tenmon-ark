/**
 * ============================================================
 *  SEED BUNDLE — ローカルデバイス用 Seed Bundle
 * ============================================================
 * 
 * オンライン時に前配備する Seed Bundle
 * ============================================================
 */

import type { FractalSeed } from "../fractal/seedV2";

export interface SeedBundle {
  id: string;
  userId: string;
  deviceId: string;
  seeds: FractalSeed[];
  metadata: {
    createdAt: number;
    expiresAt?: number;
    priority: "high" | "medium" | "low";
    tags: string[];
  };
  kotodamaIndex: Map<string, string[]>; // kotodama signature -> seed IDs
  semanticIndex: Map<string, string[]>; // keyword -> seed IDs
}

export interface SeedBundleStorage {
  saveSeedBundle(bundle: SeedBundle): Promise<void>;
  getSeedBundle(bundleId: string): Promise<SeedBundle | null>;
  getUserSeedBundles(userId: string): Promise<SeedBundle[]>;
  deleteSeedBundle(bundleId: string): Promise<void>;
}

/**
 * Seed Bundle を生成
 */
export async function generateSeedBundle(
  userId: string,
  deviceId: string,
  seeds: FractalSeed[],
  options: {
    priority?: "high" | "medium" | "low";
    expiresAt?: number;
    tags?: string[];
  } = {}
): Promise<SeedBundle> {
  // Kotodama インデックスを構築
  const kotodamaIndex = new Map<string, string[]>();
  const semanticIndex = new Map<string, string[]>();

  for (const seed of seeds) {
    // Kotodama signature でインデックス
    if (seed.kotodamaSignature) {
      const sig = JSON.stringify(seed.kotodamaSignature);
      if (!kotodamaIndex.has(sig)) {
        kotodamaIndex.set(sig, []);
      }
      kotodamaIndex.get(sig)!.push(seed.id);
    }

    // キーワードでインデックス
    if (seed.mainTags) {
      for (const tag of seed.mainTags) {
        if (!semanticIndex.has(tag)) {
          semanticIndex.set(tag, []);
        }
        semanticIndex.get(tag)!.push(seed.id);
      }
    }
  }

  const bundle: SeedBundle = {
    id: `bundle-${userId}-${deviceId}-${Date.now()}`,
    userId,
    deviceId,
    seeds,
    metadata: {
      createdAt: Date.now(),
      expiresAt: options.expiresAt,
      priority: options.priority || "medium",
      tags: options.tags || [],
    },
    kotodamaIndex,
    semanticIndex,
  };

  return bundle;
}

/**
 * Seed Bundle をローカル Kokūzō Kernel に保存
 */
export async function storeSeedBundleInLocalKokuzo(
  bundle: SeedBundle,
  localKokuzoKernel: any
): Promise<void> {
  // 各 Seed をローカル Kokūzō Kernel に保存
  for (const seed of bundle.seeds) {
    await localKokuzoKernel.saveSeed(seed as any);
  }
}

/**
 * Seed Bundle を高速オフライン検索用にインデックス
 */
export async function indexSeedBundleForFastOfflineLookup(
  bundle: SeedBundle,
  localKokuzoKernel: any
): Promise<void> {
  // Kotodama signature で検索可能にする
  // 実際の実装では、ローカル Kokūzō Kernel にインデックスを追加
  // await localKokuzoKernel.addKotodamaIndex(bundle.kotodamaIndex);
  // await localKokuzoKernel.addSemanticIndex(bundle.semanticIndex);
}

export default {
  generateSeedBundle,
  storeSeedBundleInLocalKokuzo,
  indexSeedBundleForFastOfflineLookup,
};

