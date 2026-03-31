/**
 * ============================================================
 *  SYNC FABRIC CLIENT — クライアント側 Sync Fabric ラッパー
 * ============================================================
 * 
 * 再接続時に黙って同期（UIブロック・トースト禁止）
 * ============================================================
 */

// Temporarily stub server imports for client-only build
// import { createEventLogStore } from "../../../server/kokuzo/offline/eventLogStore";
// import { SyncFabricImpl } from "../../../server/kokuzo/offline/syncFabric";
// import { OfflineStateMachineImpl } from "../../../server/kokuzo/offline/offlineStateMachine";

let syncFabric: any | null = null;
let stateMachine: any | null = null;

/**
 * Sync Fabric を初期化
 */
function initSyncFabric() {
  console.warn("[SyncFabric] Stubbed - offline functionality disabled");
  return null;
}

/**
 * 再接続時に黙って同期（UIブロック・トースト禁止）
 */
export async function syncOnReconnect(): Promise<void> {
  console.log("[SyncFabric] Stubbed - offline functionality disabled");
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

