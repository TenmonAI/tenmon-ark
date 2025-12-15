/**
 * ============================================================
 *  SNAPSHOT HOOKS — スナップショットフック
 * ============================================================
 * 
 * スナップショットを自動的に作成するフック
 * ============================================================
 */

import { createSnapshotStore, createSnapshot } from "./snapshotStore";
import { createEventLogStore } from "./eventLogStore";

let eventCount = 0;
let lastSnapshotLamport = 0;

/**
 * 100イベントごとにスナップショットを作成
 */
export async function hookSnapshotEvery100Events(
  kernelState: any
): Promise<void> {
  const eventLogStore = createEventLogStore();
  const snapshotStore = createSnapshotStore();

  eventCount++;

  if (eventCount >= 100) {
    const latestLamport = await eventLogStore.getLatestLamport();
    
    if (latestLamport > lastSnapshotLamport) {
      const snapshot = await createSnapshot(latestLamport, kernelState);
      await snapshotStore.save(snapshot);
      
      // 古いスナップショットを削除（最新5個のみ保持）
      await snapshotStore.deleteOlderThan(latestLamport - 500);
      
      lastSnapshotLamport = latestLamport;
      eventCount = 0;
    }
  }
}

/**
 * アプリ終了時にスナップショットを作成
 */
export async function hookSnapshotOnAppExit(
  kernelState: any
): Promise<void> {
  const eventLogStore = createEventLogStore();
  const snapshotStore = createSnapshotStore();

  const latestLamport = await eventLogStore.getLatestLamport();
  
  if (latestLamport > lastSnapshotLamport) {
    const snapshot = await createSnapshot(latestLamport, kernelState);
    await snapshotStore.save(snapshot);
    lastSnapshotLamport = latestLamport;
  }
}

/**
 * 電源中断時にスナップショットを作成（利用可能な場合）
 */
export async function hookSnapshotOnPowerInterruptIfAvailable(
  kernelState: any
): Promise<void> {
  if (typeof window !== "undefined") {
    // ブラウザ環境: beforeunload イベントを使用
    window.addEventListener("beforeunload", async () => {
      await hookSnapshotOnAppExit(kernelState);
    });
  } else {
    // Node.js 環境: process イベントを使用
    process.on("SIGINT", async () => {
      await hookSnapshotOnAppExit(kernelState);
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      await hookSnapshotOnAppExit(kernelState);
      process.exit(0);
    });
  }
}

export default {
  hookSnapshotEvery100Events,
  hookSnapshotOnAppExit,
  hookSnapshotOnPowerInterruptIfAvailable,
};

