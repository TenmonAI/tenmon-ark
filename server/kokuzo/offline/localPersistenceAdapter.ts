/**
 * ============================================================
 *  LOCAL PERSISTENCE ADAPTER — Local First Persistence
 * ============================================================
 * 
 * オフライン時のすべての書き込みをローカルアダプターにルーティング
 * ============================================================
 */

export interface KokuzoPersistenceAdapter {
  saveSemanticUnit(unit: any): Promise<void>;
  getSemanticUnit(id: string): Promise<any | null>;
  saveFractalSeed(seed: any): Promise<void>;
  getFractalSeed(id: string): Promise<any | null>;
  updateSeedTree(seedTree: any): Promise<void>;
  getSeedTree(): Promise<any | null>;
  updateReishoSignature(signature: any): Promise<void>;
  getReishoSignature(): Promise<any | null>;
}

/**
 * ローカル永続化アダプター
 */
export class LocalPersistenceAdapter implements KokuzoPersistenceAdapter {
  private storage: any; // LocalKokuzoKernel など

  constructor(storage: any) {
    this.storage = storage;
  }

  async saveSemanticUnit(unit: any): Promise<void> {
    await this.storage.saveSemanticUnit(unit);
  }

  async getSemanticUnit(id: string): Promise<any | null> {
    return await this.storage.getSemanticUnit(id);
  }

  async saveFractalSeed(seed: any): Promise<void> {
    await this.storage.saveSeed(seed);
  }

  async getFractalSeed(id: string): Promise<any | null> {
    return await this.storage.getSeed(id);
  }

  async updateSeedTree(seedTree: any): Promise<void> {
    // 実際の実装では、ローカルストレージに Seed Tree を保存
    // await this.storage.saveSeedTree(seedTree);
  }

  async getSeedTree(): Promise<any | null> {
    // 実際の実装では、ローカルストレージから Seed Tree を取得
    // return await this.storage.getSeedTree();
    return null;
  }

  async updateReishoSignature(signature: any): Promise<void> {
    // 実際の実装では、ローカルストレージに Reishō シグネチャを保存
    // await this.storage.saveReishoSignature(signature);
  }

  async getReishoSignature(): Promise<any | null> {
    // 実際の実装では、ローカルストレージから Reishō シグネチャを取得
    // return await this.storage.getReishoSignature();
    return null;
  }
}

/**
 * グローバル永続化アダプター（オンライン時のみ）
 */
export class GlobalPersistenceAdapter implements KokuzoPersistenceAdapter {
  private apiClient: any; // API クライアント

  constructor(apiClient: any) {
    this.apiClient = apiClient;
  }

  async saveSemanticUnit(unit: any): Promise<void> {
    // 実際の実装では、API 経由で保存
    // await this.apiClient.post("/api/kokuzo/semantic-units", unit);
  }

  async getSemanticUnit(id: string): Promise<any | null> {
    // 実際の実装では、API 経由で取得
    // return await this.apiClient.get(`/api/kokuzo/semantic-units/${id}`);
    return null;
  }

  async saveFractalSeed(seed: any): Promise<void> {
    // 実際の実装では、API 経由で保存
    // await this.apiClient.post("/api/kokuzo/fractal-seeds", seed);
  }

  async getFractalSeed(id: string): Promise<any | null> {
    // 実際の実装では、API 経由で取得
    // return await this.apiClient.get(`/api/kokuzo/fractal-seeds/${id}`);
    return null;
  }

  async updateSeedTree(seedTree: any): Promise<void> {
    // 実際の実装では、API 経由で更新
    // await this.apiClient.put("/api/kokuzo/seed-tree", seedTree);
  }

  async getSeedTree(): Promise<any | null> {
    // 実際の実装では、API 経由で取得
    // return await this.apiClient.get("/api/kokuzo/seed-tree");
    return null;
  }

  async updateReishoSignature(signature: any): Promise<void> {
    // 実際の実装では、API 経由で更新
    // await this.apiClient.put("/api/kokuzo/reisho-signature", signature);
  }

  async getReishoSignature(): Promise<any | null> {
    // 実際の実装では、API 経由で取得
    // return await this.apiClient.get("/api/kokuzo/reisho-signature");
    return null;
  }
}

/**
 * 永続化アダプタールーター（オフライン時はローカル、オンライン時はグローバル）
 */
export class PersistenceAdapterRouter {
  private localAdapter: LocalPersistenceAdapter;
  private globalAdapter: GlobalPersistenceAdapter;
  private isOffline: boolean = false;

  constructor(
    localAdapter: LocalPersistenceAdapter,
    globalAdapter: GlobalPersistenceAdapter
  ) {
    this.localAdapter = localAdapter;
    this.globalAdapter = globalAdapter;
  }

  setOfflineMode(offline: boolean): void {
    this.isOffline = offline;
  }

  getAdapter(): KokuzoPersistenceAdapter {
    return this.isOffline ? this.localAdapter : this.globalAdapter;
  }

  // すべてのメソッドをルーティング
  async saveSemanticUnit(unit: any): Promise<void> {
    const adapter = this.getAdapter();
    await adapter.saveSemanticUnit(unit);
  }

  async getSemanticUnit(id: string): Promise<any | null> {
    const adapter = this.getAdapter();
    return await adapter.getSemanticUnit(id);
  }

  async saveFractalSeed(seed: any): Promise<void> {
    const adapter = this.getAdapter();
    await adapter.saveFractalSeed(seed);
  }

  async getFractalSeed(id: string): Promise<any | null> {
    const adapter = this.getAdapter();
    return await adapter.getFractalSeed(id);
  }

  async updateSeedTree(seedTree: any): Promise<void> {
    // オフライン時はグローバル書き込みを無効化
    if (this.isOffline) {
      await this.localAdapter.updateSeedTree(seedTree);
    } else {
      await this.globalAdapter.updateSeedTree(seedTree);
    }
  }

  async getSeedTree(): Promise<any | null> {
    // オフライン時はローカルから取得
    if (this.isOffline) {
      return await this.localAdapter.getSeedTree();
    } else {
      return await this.globalAdapter.getSeedTree();
    }
  }

  async updateReishoSignature(signature: any): Promise<void> {
    const adapter = this.getAdapter();
    await adapter.updateReishoSignature(signature);
  }

  async getReishoSignature(): Promise<any | null> {
    const adapter = this.getAdapter();
    return await adapter.getReishoSignature();
  }
}

export default {
  LocalPersistenceAdapter,
  GlobalPersistenceAdapter,
  PersistenceAdapterRouter,
};

