/**
 * ============================================================
 *  EVENT LIFECYCLE MANAGER — Event肥大化対策
 * ============================================================
 * 
 * Event の圧縮・統合・ロールアップ
 * Snapshot生成の周期制御
 * Event replay 上限
 * ============================================================
 */

import type { EventLogStore, KzEvent } from "./eventLogStore";
import type { SnapshotStore, KzSnapshot } from "./snapshotStore";
import { createSnapshotStore } from "./snapshotStore";

/**
 * Snapshot生成ポリシー
 */
export interface SnapshotPolicy {
  /** N event ごとに Snapshot を生成 */
  eventThreshold: number; // デフォルト: 100
  /** 時間ベースの Snapshot 生成（ミリ秒） */
  timeThreshold: number; // デフォルト: 1時間 (3600000ms)
  /** 最大 Replay Event 数 */
  maxReplayEvents: number; // デフォルト: 1000
}

const DEFAULT_POLICY: SnapshotPolicy = {
  eventThreshold: 100,
  timeThreshold: 3600000, // 1時間
  maxReplayEvents: 1000,
};

/**
 * Event 統合ルール
 */
export interface EventConsolidationRule {
  /** 統合対象の Event kind */
  kind: string;
  /** 統合する最大 Event 数 */
  maxEvents: number;
  /** 統合関数 */
  consolidate: (events: KzEvent[]) => KzEvent;
}

/**
 * Event Lifecycle Manager
 */
export class EventLifecycleManager {
  private eventLogStore: EventLogStore;
  private snapshotStore: SnapshotStore;
  private policy: SnapshotPolicy;
  private lastSnapshotLamport: number = 0;
  private lastSnapshotTime: number = Date.now();
  private consolidationRules: EventConsolidationRule[] = [];

  constructor(
    eventLogStore: EventLogStore,
    snapshotStore?: SnapshotStore,
    policy?: Partial<SnapshotPolicy>
  ) {
    this.eventLogStore = eventLogStore;
    this.snapshotStore = snapshotStore || createSnapshotStore();
    this.policy = { ...DEFAULT_POLICY, ...policy };
  }

  /**
   * Event を追加し、必要に応じて Snapshot を生成
   */
  async appendEvent(
    event: Omit<KzEvent, "id" | "hash" | "previousHash" | "lamport">
  ): Promise<KzEvent> {
    const kzEvent = await this.eventLogStore.append(event);
    const currentLamport = await this.eventLogStore.getLatestLamport();

    // Snapshot 生成チェック
    const shouldCreateSnapshot =
      currentLamport - this.lastSnapshotLamport >= this.policy.eventThreshold ||
      Date.now() - this.lastSnapshotTime >= this.policy.timeThreshold;

    if (shouldCreateSnapshot) {
      await this.createSnapshot(currentLamport);
    }

    return kzEvent;
  }

  /**
   * Snapshot を生成
   */
  async createSnapshot(lamport: number): Promise<void> {
    try {
      // Kernel 状態を取得（TODO: LocalKokuzoKernel から取得）
      const kernelState = await this.getKernelState();

      const snapshot: KzSnapshot = {
        id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        lamport,
        timestamp: Date.now(),
        kernelState,
        hash: this.computeSnapshotHash(kernelState, lamport),
      };

      await this.snapshotStore.save(snapshot);
      this.lastSnapshotLamport = lamport;
      this.lastSnapshotTime = Date.now();

      console.log(`[EventLifecycle] Snapshot created at lamport ${lamport}`);

      // メトリクス記録（GAP-F）
      try {
        const { getMetricsCollector } = await import("./metricsCollector");
        getMetricsCollector().incrementSnapshotCount();
      } catch (error) {
        // メトリクス記録失敗は無視
      }

      // 古い Snapshot を削除（最新3つを保持）
      await this.cleanupOldSnapshots(lamport);
    } catch (error) {
      console.error("[EventLifecycle] Failed to create snapshot:", error);
    }
  }

  /**
   * Event を Replay（上限付き）
   */
  async replayEvents(fromLamport?: number): Promise<KzEvent[]> {
    const startTime = Date.now();
    const events = await this.eventLogStore.replay(fromLamport);

    // 最大 Replay Event 数を制限
    if (events.length > this.policy.maxReplayEvents) {
      console.warn(
        `[EventLifecycle] Replay events truncated: ${events.length} -> ${this.policy.maxReplayEvents}`
      );
      const truncated = events.slice(-this.policy.maxReplayEvents);
      const replayTime = Date.now() - startTime;
      
      // メトリクス記録（GAP-F）
      try {
        const { getMetricsCollector } = await import("./metricsCollector");
        getMetricsCollector().recordReplayTime(replayTime);
      } catch (error) {
        // メトリクス記録失敗は無視
      }
      
      return truncated;
    }

    const replayTime = Date.now() - startTime;
    
    // メトリクス記録（GAP-F）
    try {
      const { getMetricsCollector } = await import("./metricsCollector");
      getMetricsCollector().recordReplayTime(replayTime);
    } catch (error) {
      // メトリクス記録失敗は無視
    }

    return events;
  }

  /**
   * 古い Event を統合（非削除）
   */
  async consolidateOldEvents(): Promise<void> {
    const latestLamport = await this.eventLogStore.getLatestLamport();
    const snapshot = await this.snapshotStore.loadLatest();

    if (!snapshot) {
      return; // Snapshot がない場合は統合しない
    }

    // Snapshot より前の Event を取得
    const oldEvents = await this.eventLogStore.replay(0);
    const eventsBeforeSnapshot = oldEvents.filter(
      (e) => e.lamport < snapshot.lamport
    );

    if (eventsBeforeSnapshot.length === 0) {
      return;
    }

    // 統合ルールに従って Event を統合
    for (const rule of this.consolidationRules) {
      const eventsToConsolidate = eventsBeforeSnapshot.filter(
        (e) => e.kind === rule.kind
      );

      if (eventsToConsolidate.length > rule.maxEvents) {
        // 統合 Event を生成
        const consolidated = rule.consolidate(eventsToConsolidate);
        console.log(
          `[EventLifecycle] Consolidated ${eventsToConsolidate.length} events of kind ${rule.kind}`
        );
        // 統合 Event は新しい Event として追加（元の Event は保持）
        // TODO: 統合 Event をマークして、通常の Replay ではスキップする
      }
    }
  }

  /**
   * 古い Snapshot を削除
   */
  private async cleanupOldSnapshots(currentLamport: number): Promise<void> {
    // 最新3つの Snapshot を保持
    // それより古い Snapshot は削除
    // TODO: SnapshotStore に deleteOlderThan を実装
    try {
      await this.snapshotStore.deleteOlderThan(currentLamport - this.policy.eventThreshold * 3);
    } catch (error) {
      console.warn("[EventLifecycle] Failed to cleanup old snapshots:", error);
    }
  }

  /**
   * Kernel 状態を取得
   */
  private async getKernelState(): Promise<KzSnapshot["kernelState"]> {
    // TODO: LocalKokuzoKernel から実際の状態を取得
    // 現時点では空の状態を返す
    return {
      seedTree: {},
      quantumState: {},
      reishoSignature: {},
      memoryContext: {},
    };
  }

  /**
   * Snapshot のハッシュを計算
   */
  private computeSnapshotHash(kernelState: any, lamport: number): string {
    const crypto = require("crypto");
    const data = JSON.stringify({ kernelState, lamport });
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  /**
   * 統合ルールを追加
   */
  addConsolidationRule(rule: EventConsolidationRule): void {
    this.consolidationRules.push(rule);
  }

  /**
   * 初期化（最新 Snapshot を読み込む）
   */
  async initialize(): Promise<void> {
    const snapshot = await this.snapshotStore.loadLatest();
    if (snapshot) {
      this.lastSnapshotLamport = snapshot.lamport;
      this.lastSnapshotTime = snapshot.timestamp;
    }
  }
}

/**
 * デフォルトの統合ルール
 */
export function createDefaultConsolidationRules(): EventConsolidationRule[] {
  return [
    {
      kind: "offlineMutation",
      maxEvents: 50,
      consolidate: (events) => {
        // 同じ種類の offlineMutation を統合
        const consolidatedData = {
          type: "CONSOLIDATED_OFFLINE_MUTATIONS",
          count: events.length,
          events: events.map((e) => e.data),
        };

        return {
          ...events[0],
          data: consolidatedData,
          kind: "offlineMutation" as const,
        };
      },
    },
  ];
}

