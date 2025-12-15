/**
 * ============================================================
 *  KOKŪZŌ DUAL STRUCTURE — Kokūzō Server デュアル構造
 * ============================================================
 * 
 * パーソナル vs グローバル Kokūzō ノードの管理
 * ============================================================
 */

export type KokuzoNodeType = "personal" | "global";

export interface KokuzoNode {
  id: string;
  type: KokuzoNodeType;
  userId?: string; // personal の場合のみ
  isOffline: boolean;
  lastSyncTimestamp?: number;
}

export interface KokuzoDualStructure {
  getPersonalNodes(userId: string): Promise<KokuzoNode[]>;
  getGlobalNodes(): Promise<KokuzoNode[]>;
  createPersonalNode(userId: string): Promise<KokuzoNode>;
  setOfflineMode(nodeId: string, offline: boolean): Promise<void>;
  enforceOfflineRestrictions(nodeId: string): Promise<void>;
  getNodeStatus(nodeId: string): Promise<{
    isOnline: boolean;
    isPersonal: boolean;
    canMergeGlobalSeeds: boolean;
    canRecluster: boolean;
  }>;
}

/**
 * Kokūzō デュアル構造マネージャー
 */
export class KokuzoDualStructureManager implements KokuzoDualStructure {
  private nodes: Map<string, KokuzoNode> = new Map();

  async getPersonalNodes(userId: string): Promise<KokuzoNode[]> {
    return Array.from(this.nodes.values()).filter(
      (node) => node.type === "personal" && node.userId === userId
    );
  }

  async getGlobalNodes(): Promise<KokuzoNode[]> {
    return Array.from(this.nodes.values()).filter(
      (node) => node.type === "global"
    );
  }

  async createPersonalNode(userId: string): Promise<KokuzoNode> {
    const node: KokuzoNode = {
      id: `personal-${userId}-${Date.now()}`,
      type: "personal",
      userId,
      isOffline: false,
    };

    this.nodes.set(node.id, node);
    return node;
  }

  async setOfflineMode(nodeId: string, offline: boolean): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.isOffline = offline;
      if (offline) {
        await this.enforceOfflineRestrictions(nodeId);
      }
    }
  }

  /**
   * オフラインモード時の制限を適用
   */
  async enforceOfflineRestrictions(nodeId: string): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (!node || !node.isOffline) {
      return;
    }

    // オフライン時は以下を禁止:
    // - グローバルシードのマージ
    // - グローバル再クラスタリング
    // これらは policyLayer と apiLayer で強制される
  }

  /**
   * ノードのステータスを取得
   */
  async getNodeStatus(nodeId: string): Promise<{
    isOnline: boolean;
    isPersonal: boolean;
    canMergeGlobalSeeds: boolean;
    canRecluster: boolean;
  }> {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    return {
      isOnline: !node.isOffline,
      isPersonal: node.type === "personal",
      canMergeGlobalSeeds: !node.isOffline && node.type === "global",
      canRecluster: !node.isOffline && node.type === "global",
    };
  }
}

/**
 * ポリシーレイヤー: オフライン時のルールを適用
 */
export class KokuzoPolicyLayer {
  private dualStructure: KokuzoDualStructure;

  constructor(dualStructure: KokuzoDualStructure) {
    this.dualStructure = dualStructure;
  }

  /**
   * オフライン時のルールを取得
   */
  async getOfflineRules(nodeId: string): Promise<{
    allowGlobalSeedMerge: boolean;
    allowGlobalRecluster: boolean;
    allowPersonalSeedCreation: boolean;
  }> {
    const status = await this.dualStructure.getNodeStatus(nodeId);

    return {
      allowGlobalSeedMerge: status.canMergeGlobalSeeds,
      allowGlobalRecluster: status.canRecluster,
      allowPersonalSeedCreation: true, // パーソナルシードの作成は常に許可
    };
  }
}

/**
 * API レイヤー: ローカルとグローバルの切り替え
 */
export class KokuzoAPILayer {
  private dualStructure: KokuzoDualStructure;
  private policyLayer: KokuzoPolicyLayer;

  constructor(
    dualStructure: KokuzoDualStructure,
    policyLayer: KokuzoPolicyLayer
  ) {
    this.dualStructure = dualStructure;
    this.policyLayer = policyLayer;
  }

  /**
   * ローカルまたはグローバルの API を選択
   */
  async switchBetweenLocalAndGlobal(
    nodeId: string,
    operation: "read" | "write"
  ): Promise<"local" | "global"> {
    const status = await this.dualStructure.getNodeStatus(nodeId);

    if (status.isPersonal && status.isOnline) {
      // パーソナルノードでオンライン: グローバル API を使用
      return "global";
    } else if (status.isPersonal && !status.isOnline) {
      // パーソナルノードでオフライン: ローカル API を使用
      return "local";
    } else {
      // グローバルノード: 常にグローバル API
      return "global";
    }
  }
}

export default KokuzoDualStructureManager;

