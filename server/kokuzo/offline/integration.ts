/**
 * ============================================================
 *  OFFLINE INTEGRATION — オフライン統合
 * ============================================================
 * 
 * オフライン機能を実際に動作させる統合レイヤー
 * ============================================================
 */

import { createEventLogStore, type EventLogStore } from "./eventLogStore";
import { createSnapshotStore, type SnapshotStore } from "./snapshotStore";
import { OfflineStateMachineImpl, hookNetworkDisconnect } from "./offlineStateMachine";
import { SyncFabricImpl, type SyncFabric } from "./syncFabric";
import { PersistenceAdapterRouter, LocalPersistenceAdapter } from "./localPersistenceAdapter";
import { LocalKokuzoKernel } from "../offline/localKokuzoKernel";
import { hookSnapshotEvery100Events } from "./snapshotHooks";
import { restoreMemoryKernelOnBoot } from "./memoryKernelRestore";

/**
 * グローバルオフラインインスタンス
 */
let globalEventLogStore: EventLogStore | null = null;
let globalSnapshotStore: SnapshotStore | null = null;
let globalStateMachine: OfflineStateMachineImpl | null = null;
let globalSyncFabric: SyncFabric | null = null;
let globalPersistenceAdapter: PersistenceAdapterRouter | null = null;

/**
 * オフライン機能を初期化
 */
export async function initializeOfflineSystem(): Promise<void> {
  console.log("[KOKUZO][OFFLINE] Initializing offline system...");

  // 1. Event Log Store を作成
  globalEventLogStore = createEventLogStore();
  console.log("[KOKUZO][OFFLINE] EventLogStore created");

  // 2. Snapshot Store を作成
  globalSnapshotStore = createSnapshotStore();
  console.log("[KOKUZO][OFFLINE] SnapshotStore created");

  // 3. State Machine を作成
  globalStateMachine = new OfflineStateMachineImpl();
  hookNetworkDisconnect(globalStateMachine);
  console.log("[KOKUZO][OFFLINE] StateMachine created and hooked");

  // 4. Sync Fabric を作成
  globalSyncFabric = new SyncFabricImpl(globalEventLogStore, globalStateMachine);
  console.log("[KOKUZO][OFFLINE] SyncFabric created");

  // 5. Persistence Adapter を作成
  const localKokuzoKernel = new LocalKokuzoKernel();
  const localAdapter = new LocalPersistenceAdapter(localKokuzoKernel);
  // TODO: GlobalPersistenceAdapter を作成
  const isOffline = typeof window !== "undefined" ? !navigator.onLine : false;
  globalPersistenceAdapter = new PersistenceAdapterRouter(localAdapter, localAdapter as any);
  globalPersistenceAdapter.setOfflineMode(isOffline);
  console.log("[KOKUZO][OFFLINE] PersistenceAdapter created");

  // 6. 起動時に Memory Kernel を復元
  const restoredState = await restoreMemoryKernelOnBoot();
  if (restoredState) {
    console.log("[KOKUZO][OFFLINE] Memory kernel restored from snapshot");
  }

  // 7. ネットワーク状態を監視
  if (typeof window !== "undefined") {
    window.addEventListener("online", async () => {
      console.log("[KOKUZO][OFFLINE] Network online, triggering sync...");
      globalStateMachine?.setOnline();
      await globalSyncFabric?.onReconnect();
    });

    window.addEventListener("offline", () => {
      console.log("[KOKUZO][OFFLINE] Network offline");
      globalStateMachine?.setOffline();
    });
  }

  console.log("[KOKUZO][OFFLINE] Offline system initialized");
}

/**
 * Event Log Store を取得
 */
export function getEventLogStore(): EventLogStore {
  if (!globalEventLogStore) {
    throw new Error("EventLogStore not initialized. Call initializeOfflineSystem() first.");
  }
  return globalEventLogStore;
}

/**
 * Snapshot Store を取得
 */
export function getSnapshotStore(): SnapshotStore {
  if (!globalSnapshotStore) {
    throw new Error("SnapshotStore not initialized. Call initializeOfflineSystem() first.");
  }
  return globalSnapshotStore;
}

/**
 * State Machine を取得
 */
export function getStateMachine(): OfflineStateMachineImpl {
  if (!globalStateMachine) {
    throw new Error("StateMachine not initialized. Call initializeOfflineSystem() first.");
  }
  return globalStateMachine;
}

/**
 * Sync Fabric を取得
 */
export function getSyncFabric(): SyncFabric {
  if (!globalSyncFabric) {
    throw new Error("SyncFabric not initialized. Call initializeOfflineSystem() first.");
  }
  return globalSyncFabric;
}

/**
 * Persistence Adapter を取得
 */
export function getPersistenceAdapter(): PersistenceAdapterRouter {
  if (!globalPersistenceAdapter) {
    throw new Error("PersistenceAdapter not initialized. Call initializeOfflineSystem() first.");
  }
  return globalPersistenceAdapter;
}

/**
 * イベントを記録（会話・推論・メモリ操作など）
 */
export async function logEvent(
  kind: "semanticUnitCreated" | "fractalSeedCreated" | "seedTreeUpdated" | "reishoSignatureUpdated" | "conversationAdded" | "memoryRetrieved" | "offlineMutation",
  data: any
): Promise<void> {
  const eventStore = getEventLogStore();
  await eventStore.append({
    kind,
    timestamp: Date.now(),
    data,
    sent: false,
  });

  // 100イベントごとにスナップショットを作成
  try {
    const snapshotStore = getSnapshotStore();
    const eventLogStore = getEventLogStore();
    const latestLamport = await eventLogStore.getLatestLamport();
    
    // 100イベントごとにスナップショットを作成
    if (latestLamport % 100 === 0 && latestLamport > 0) {
      // 現在の Kernel 状態を取得（簡易版）
      const kernelState = {
        seedTree: null, // TODO: 実際の SeedTree を取得
        quantumState: null, // TODO: 実際の QuantumState を取得
        reishoSignature: null, // TODO: 実際の Reishō シグネチャを取得
        memoryContext: { eventCount: latestLamport },
      };
      
      await hookSnapshotEvery100Events(kernelState);
    }
  } catch (error) {
    console.error("[KOKUZO][OFFLINE] Failed to create snapshot:", error);
  }
}

export default {
  initializeOfflineSystem,
  getEventLogStore,
  getSnapshotStore,
  getStateMachine,
  getSyncFabric,
  getPersistenceAdapter,
  logEvent,
};

