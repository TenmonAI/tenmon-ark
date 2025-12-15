/**
 * ============================================================
 *  SYNC FABRIC CLIENT — クライアント側 Sync Fabric ラッパー
 * ============================================================
 * 
 * 再接続時に黙って同期（UIブロック・トースト禁止）
 * ============================================================
 */

import { createEventLogStore } from "../../../server/kokuzo/offline/eventLogStore";
import { SyncFabricImpl } from "../../../server/kokuzo/offline/syncFabric";
import { OfflineStateMachineImpl } from "../../../server/kokuzo/offline/offlineStateMachine";

let syncFabric: SyncFabricImpl | null = null;
let stateMachine: OfflineStateMachineImpl | null = null;

/**
 * Sync Fabric を初期化
 */
function initSyncFabric() {
  if (syncFabric) {
    return syncFabric;
  }

  const eventLogStore = createEventLogStore();
  
  // OfflineStateMachine を初期化
  stateMachine = new OfflineStateMachineImpl();
  
  // ネットワーク状態を監視
  if (typeof window !== "undefined") {
    window.addEventListener("offline", () => {
      stateMachine?.setOffline();
    });
    
    window.addEventListener("online", () => {
      stateMachine?.setOnline();
    });
  }

  syncFabric = new SyncFabricImpl(eventLogStore, stateMachine);

  return syncFabric;
}

/**
 * 再接続時に黙って同期（UIブロック・トースト禁止）
 */
export async function syncOnReconnect(): Promise<void> {
  try {
    const fabric = initSyncFabric();
    
    // 黙って同期（成功・失敗ともにUIに表示しない）
    await fabric.onReconnect();
  } catch (error) {
    // エラーは無視（ユーザーに知らせない）
    console.warn("[SyncFabric] Sync failed silently:", error);
  }
}

/**
 * オンライン状態を監視し、再接続時に自動同期
 */
export function setupAutoSync(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleOnline = () => {
    // 再接続時に黙って同期
    syncOnReconnect();
  };

  window.addEventListener("online", handleOnline);

  // クリーンアップ関数
  return () => {
    window.removeEventListener("online", handleOnline);
  };
}

export default {
  syncOnReconnect,
  setupAutoSync,
};

