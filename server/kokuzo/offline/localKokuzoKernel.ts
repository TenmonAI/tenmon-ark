/**
 * ============================================================
 *  LOCAL KOKŪZŌ KERNEL — ローカル Kokūzō Kernel
 * ============================================================
 * 
 * オフライン時のローカル Kokūzō Kernel
 * ============================================================
 */

export interface LocalSemanticUnit {
  id: string;
  text: string;
  embedding?: number[];
  metadata?: {
    source?: string;
    sourceId?: string;
    position?: { start: number; end: number };
    tags?: string[];
  };
  createdAt: number;
  updatedAt: number;
}

export interface LocalSeed {
  id: string;
  semanticUnitIds: string[];
  compressedRepresentation: {
    centroidVector?: number[];
    kotodamaVector?: number[];
    fireWaterBalance?: number;
    kanagiPhaseMode?: string;
    mainTags?: string[];
    lawIds?: string[];
    semanticEdges?: Array<{ targetId: string; weight: number }>;
    seedWeight?: number;
  };
  createdAt: number;
  updatedAt: number;
}

export interface SeedBundle {
  id: string;
  seeds: LocalSeed[];
  kotodamaIndex: Map<string, string[]>;
  semanticIndex: Map<string, string[]>;
}

export interface LocalKokuzoStorage {
  saveSemanticUnit(unit: LocalSemanticUnit): Promise<void>;
  getSemanticUnit(id: string): Promise<LocalSemanticUnit | null>;
  getAllSemanticUnits(limit?: number): Promise<LocalSemanticUnit[]>;
  
  saveSeed(seed: LocalSeed): Promise<void>;
  getSeed(id: string): Promise<LocalSeed | null>;
  getAllSeeds(limit?: number): Promise<LocalSeed[]>;
  
  syncTopNGlobalSeeds(globalSeeds: LocalSeed[], n: number): Promise<void>;
  
  saveSeedBundle(bundle: SeedBundle): Promise<void>;
  getSeedBundle(bundleId: string): Promise<SeedBundle | null>;
  
  queryByKotodamaSignature(signature: string): Promise<LocalSeed[]>;
  queryByKeyword(keyword: string): Promise<LocalSeed[]>;
  getRecentlyUsedSeeds(limit?: number): Promise<LocalSeed[]>;
}

/**
 * IndexedDB を使用したローカル Kokūzō ストレージ
 */
export class IndexedDBKokuzoStorage implements LocalKokuzoStorage {
  private dbName = "tenmon_ark_kokuzo_local";
  private unitStoreName = "semantic_units";
  private seedStoreName = "seeds";
  private bundleStoreName = "seed_bundles";
  private dbVersion = 1;

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !("indexedDB" in window)) {
        reject(new Error("IndexedDB is not available"));
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = () => {
        const db = request.result;

        // Semantic Units ストア
        if (!db.objectStoreNames.contains(this.unitStoreName)) {
          const unitStore = db.createObjectStore(this.unitStoreName, { keyPath: "id" });
          unitStore.createIndex("createdAt", "createdAt", { unique: false });
          unitStore.createIndex("updatedAt", "updatedAt", { unique: false });
        }

        // Seeds ストア
        if (!db.objectStoreNames.contains(this.seedStoreName)) {
          const seedStore = db.createObjectStore(this.seedStoreName, { keyPath: "id" });
          seedStore.createIndex("createdAt", "createdAt", { unique: false });
          seedStore.createIndex("updatedAt", "updatedAt", { unique: false });
          seedStore.createIndex("seedWeight", "compressedRepresentation.seedWeight", { unique: false });
        }

        // Seed Bundles ストア
        if (!db.objectStoreNames.contains(this.bundleStoreName)) {
          const bundleStore = db.createObjectStore(this.bundleStoreName, { keyPath: "id" });
          bundleStore.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
    });
  }

  async saveSemanticUnit(unit: LocalSemanticUnit): Promise<void> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return;
    }

    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.unitStoreName], "readwrite");
      const store = transaction.objectStore(this.unitStoreName);
      await new Promise<void>((resolve, reject) => {
        const request = store.put(unit);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("[KOKUZO][LOCAL] Failed to save semantic unit:", error);
      throw error;
    }
  }

  async getSemanticUnit(id: string): Promise<LocalSemanticUnit | null> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return null;
    }

    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.unitStoreName], "readonly");
      const store = transaction.objectStore(this.unitStoreName);
      return await new Promise<LocalSemanticUnit | null>((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("[KOKUZO][LOCAL] Failed to get semantic unit:", error);
      return null;
    }
  }

  async getAllSemanticUnits(limit: number = 100): Promise<LocalSemanticUnit[]> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return [];
    }

    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.unitStoreName], "readonly");
      const store = transaction.objectStore(this.unitStoreName);
      const index = store.index("updatedAt");
      return await new Promise<LocalSemanticUnit[]>((resolve, reject) => {
        const request = index.getAll();
        request.onsuccess = () => {
          const units = request.result || [];
          const sorted = units.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit);
          resolve(sorted);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("[KOKUZO][LOCAL] Failed to get all semantic units:", error);
      return [];
    }
  }

  async saveSeed(seed: LocalSeed): Promise<void> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return;
    }

    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.seedStoreName], "readwrite");
      const store = transaction.objectStore(this.seedStoreName);
      await new Promise<void>((resolve, reject) => {
        const request = store.put(seed);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("[KOKUZO][LOCAL] Failed to save seed:", error);
      throw error;
    }
  }

  async getSeed(id: string): Promise<LocalSeed | null> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return null;
    }

    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.seedStoreName], "readonly");
      const store = transaction.objectStore(this.seedStoreName);
      return await new Promise<LocalSeed | null>((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("[KOKUZO][LOCAL] Failed to get seed:", error);
      return null;
    }
  }

  async getAllSeeds(limit: number = 100): Promise<LocalSeed[]> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return [];
    }

    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.seedStoreName], "readonly");
      const store = transaction.objectStore(this.seedStoreName);
      const index = store.index("seedWeight");
      return await new Promise<LocalSeed[]>((resolve, reject) => {
        const request = index.getAll();
        request.onsuccess = () => {
          const seeds = request.result || [];
          const sorted = seeds
            .sort((a, b) => (b.compressedRepresentation.seedWeight || 0) - (a.compressedRepresentation.seedWeight || 0))
            .slice(0, limit);
          resolve(sorted);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("[KOKUZO][LOCAL] Failed to get all seeds:", error);
      return [];
    }
  }

  async syncTopNGlobalSeeds(globalSeeds: LocalSeed[], n: number): Promise<void> {
    // トップ N のグローバルシードをローカルに同期
    const topN = globalSeeds
      .sort((a, b) => (b.compressedRepresentation.seedWeight || 0) - (a.compressedRepresentation.seedWeight || 0))
      .slice(0, n);
    
    for (const seed of topN) {
      await this.saveSeed(seed);
    }
  }

  async saveSeedBundle(bundle: SeedBundle): Promise<void> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return;
    }

    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.bundleStoreName], "readwrite");
      const store = transaction.objectStore(this.bundleStoreName);
      await new Promise<void>((resolve, reject) => {
        const request = store.put(bundle);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("[KOKUZO][LOCAL] Failed to save seed bundle:", error);
      throw error;
    }
  }

  async getSeedBundle(bundleId: string): Promise<SeedBundle | null> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return null;
    }

    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.bundleStoreName], "readonly");
      const store = transaction.objectStore(this.bundleStoreName);
      return await new Promise<SeedBundle | null>((resolve, reject) => {
        const request = store.get(bundleId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("[KOKUZO][LOCAL] Failed to get seed bundle:", error);
      return null;
    }
  }

  async queryByKotodamaSignature(signature: string): Promise<LocalSeed[]> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return [];
    }

    try {
      const allSeeds = await this.getAllSeeds(1000);
      return allSeeds.filter((seed) => {
        const kotodamaVector = seed.compressedRepresentation.kotodamaVector;
        if (!kotodamaVector) return false;
        // 簡易的なシグネチャマッチング（実際の実装ではより高度なマッチングが必要）
        return JSON.stringify(kotodamaVector).includes(signature);
      });
    } catch (error) {
      console.error("[KOKUZO][LOCAL] Failed to query by kotodama signature:", error);
      return [];
    }
  }

  async queryByKeyword(keyword: string): Promise<LocalSeed[]> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return [];
    }

    try {
      const allSeeds = await this.getAllSeeds(1000);
      const allUnits = await this.getAllSemanticUnits(1000);
      const keywordLower = keyword.toLowerCase();

      // SemanticUnit のテキストにキーワードが含まれるものを検索
      const matchingUnitIds = new Set(
        allUnits
          .filter((unit) => unit.text.toLowerCase().includes(keywordLower))
          .map((unit) => unit.id)
      );

      // マッチする SemanticUnit を含む Seed を返す
      return allSeeds.filter((seed) =>
        seed.semanticUnitIds.some((unitId) => matchingUnitIds.has(unitId))
      );
    } catch (error) {
      console.error("[KOKUZO][LOCAL] Failed to query by keyword:", error);
      return [];
    }
  }

  async getRecentlyUsedSeeds(limit: number = 10): Promise<LocalSeed[]> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return [];
    }

    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.seedStoreName], "readonly");
      const store = transaction.objectStore(this.seedStoreName);
      const index = store.index("updatedAt");
      return await new Promise<LocalSeed[]>((resolve, reject) => {
        const request = index.getAll();
        request.onsuccess = () => {
          const seeds = request.result || [];
          const sorted = seeds.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit);
          resolve(sorted);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("[KOKUZO][LOCAL] Failed to get recently used seeds:", error);
      return [];
    }
  }
}

/**
 * SQLite を使用したローカル Kokūzō ストレージ（Node.js 環境）
 */
export class SQLiteKokuzoStorage implements LocalKokuzoStorage {
  private dbPath: string;

  constructor(dbPath: string = "./storage/kokuzo_local.db") {
    this.dbPath = dbPath;
  }

  async saveSemanticUnit(unit: LocalSemanticUnit): Promise<void> {
    // SQLite に保存
    // 実際の実装では better-sqlite3 などを使用
  }

  async getSemanticUnit(id: string): Promise<LocalSemanticUnit | null> {
    // SQLite から取得
    // 実際の実装では better-sqlite3 などを使用
    return null;
  }

  async getAllSemanticUnits(limit: number = 100): Promise<LocalSemanticUnit[]> {
    // SQLite から取得
    // 実際の実装では better-sqlite3 などを使用
    return [];
  }

  async saveSeed(seed: LocalSeed): Promise<void> {
    // SQLite に保存
    // 実際の実装では better-sqlite3 などを使用
  }

  async getSeed(id: string): Promise<LocalSeed | null> {
    // SQLite から取得
    // 実際の実装では better-sqlite3 などを使用
    return null;
  }

  async getAllSeeds(limit: number = 100): Promise<LocalSeed[]> {
    // SQLite から取得
    // 実際の実装では better-sqlite3 などを使用
    return [];
  }

  async syncTopNGlobalSeeds(globalSeeds: LocalSeed[], n: number): Promise<void> {
    // トップ N のグローバルシードをローカルに同期
    const topN = globalSeeds
      .sort((a, b) => (b.compressedRepresentation.seedWeight || 0) - (a.compressedRepresentation.seedWeight || 0))
      .slice(0, n);
    
    for (const seed of topN) {
      await this.saveSeed(seed);
    }
  }
}

/**
 * ローカル Kokūzō Kernel
 */
export class LocalKokuzoKernel {
  private storage: LocalKokuzoStorage;
  private isOffline: boolean = false;

  constructor(storage?: LocalKokuzoStorage) {
    // 環境に応じてストレージを選択
    if (typeof window !== "undefined") {
      // ブラウザ環境: IndexedDB
      this.storage = storage || new IndexedDBKokuzoStorage();
    } else {
      // Node.js 環境: SQLite
      this.storage = storage || new SQLiteKokuzoStorage();
    }
  }

  /**
   * オフラインモードを設定
   */
  setOfflineMode(offline: boolean): void {
    this.isOffline = offline;
  }

  /**
   * SemanticUnit を保存
   */
  async saveSemanticUnit(unit: LocalSemanticUnit): Promise<void> {
    await this.storage.saveSemanticUnit(unit);
  }

  /**
   * SemanticUnit を取得
   */
  async getSemanticUnit(id: string): Promise<LocalSemanticUnit | null> {
    return await this.storage.getSemanticUnit(id);
  }

  /**
   * すべての SemanticUnit を取得
   */
  async getAllSemanticUnits(limit?: number): Promise<LocalSemanticUnit[]> {
    return await this.storage.getAllSemanticUnits(limit);
  }

  /**
   * Seed を保存
   */
  async saveSeed(seed: LocalSeed): Promise<void> {
    await this.storage.saveSeed(seed);
  }

  /**
   * Seed を取得
   */
  async getSeed(id: string): Promise<LocalSeed | null> {
    return await this.storage.getSeed(id);
  }

  /**
   * すべての Seed を取得
   */
  async getAllSeeds(limit?: number): Promise<LocalSeed[]> {
    return await this.storage.getAllSeeds(limit);
  }

  /**
   * トップ N のグローバルシードをローカルに同期（オンライン時のみ）
   */
  async syncTopNGlobalSeeds(globalSeeds: LocalSeed[], n: number = 100): Promise<void> {
    if (!this.isOffline) {
      await this.storage.syncTopNGlobalSeeds(globalSeeds, n);
    }
  }

  /**
   * 最近の会話と重要な Reishō Seeds をローカルにキャッシュ
   */
  async cacheRecentConversationsAndSeeds(
    conversations: any[],
    seeds: LocalSeed[]
  ): Promise<void> {
    // 最近の会話をローカルに保存
    // 実際の実装では会話ストレージを使用
    
    // 重要な Reishō Seeds をローカルに保存
    for (const seed of seeds) {
      await this.saveSeed(seed);
    }
  }

  /**
   * Seed Bundle を保存
   */
  async saveSeedBundle(bundle: SeedBundle): Promise<void> {
    await this.storage.saveSeedBundle(bundle);
  }

  /**
   * Seed Bundle を取得
   */
  async getSeedBundle(bundleId: string): Promise<SeedBundle | null> {
    return await this.storage.getSeedBundle(bundleId);
  }

  /**
   * Kotodama signature で検索
   */
  async queryByKotodamaSignature(signature: string): Promise<LocalSeed[]> {
    return await this.storage.queryByKotodamaSignature(signature);
  }

  /**
   * キーワードで検索
   */
  async queryByKeyword(keyword: string): Promise<LocalSeed[]> {
    return await this.storage.queryByKeyword(keyword);
  }

  /**
   * 最近使用された Seed を取得
   */
  async getRecentlyUsedSeeds(limit: number = 10): Promise<LocalSeed[]> {
    return await this.storage.getRecentlyUsedSeeds(limit);
  }

  /**
   * Reishō シグネチャを取得
   */
  async getReishoSignature(): Promise<any | null> {
    // 実際の実装では、ローカルストレージから Reishō シグネチャを取得
    // return await this.storage.getReishoSignature();
    return null;
  }

  /**
   * Event を追加（Event Sourcing）
   */
  async appendEvent(event: {
    type: string;
    conversationId?: number;
    fileId?: number;
    enabled?: boolean;
    projectId?: number | null;
    payload?: any;
  }): Promise<void> {
    // Event Log Store に記録
    const { createEventLogStore } = await import("./eventLogStore");
    const eventLogStore = createEventLogStore();
    
    // デバイスIDと優先度を取得
    const { getDeviceId, getDevicePriority } = await import("./deviceIdentity");
    const deviceId = await getDeviceId();
    const devicePriority = await getDevicePriority();
    
    await eventLogStore.append({
      kind: "offlineMutation",
      timestamp: Date.now(),
      deviceId,
      devicePriority,
      data: {
        type: event.type,
        conversationId: event.conversationId,
        fileId: event.fileId,
        enabled: event.enabled,
        projectId: event.projectId,
        payload: event.payload,
      },
    });
  }
}

export default LocalKokuzoKernel;

