/**
 * ============================================================
 *  RESTORE FROM SNAPSHOT — 再起動・電源断からの完全復帰
 * ============================================================
 * 
 * Snapshot + Event Replay で状態を復元
 * ============================================================
 */

// Temporarily stub server imports for client-only build
// import { IndexedDBSnapshotStore } from "../../../server/kokuzo/offline/snapshotStore";
// import { IndexedDBEventLogStore } from "../../../server/kokuzo/offline/eventLogStore";
// import type { KzEvent } from "../../../server/kokuzo/offline/eventLogStore";

type KzEvent = any;

/**
 * Snapshot から状態を復元
 */
export async function restoreFromSnapshot(): Promise<void> {
  console.log("[Restore] Stubbed - offline functionality disabled");
}

/**
 * Kernel 状態を復元
 */
async function restoreKernelState(kernelState: any): Promise<void> {
  console.log("[Restore] Stubbed - kernel state restore disabled");
}

/**
 * Event を適用
 */
async function applyEvent(event: KzEvent): Promise<void> {
  console.log("[Restore] Stubbed - event application disabled");
}

/**
 * 起動時に復元を実行
 */
export function setupRestoreOnStartup(): void {
  if (typeof window === "undefined") {
    return;
  }

  // ページロード時に復元
  if (document.readyState === "complete") {
    restoreFromSnapshot();
  } else {
    window.addEventListener("load", () => {
      restoreFromSnapshot();
    });
  }
}

export default {
  restoreFromSnapshot,
  setupRestoreOnStartup,
};

