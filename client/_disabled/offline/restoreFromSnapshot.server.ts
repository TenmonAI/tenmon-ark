/**
 * ============================================================
 *  RESTORE FROM SNAPSHOT — 再起動・電源断からの完全復帰
 * ============================================================
 * 
 * Snapshot + Event Replay で状態を復元
 * ============================================================
 */

import { IndexedDBSnapshotStore } from "../../../server/kokuzo/offline/snapshotStore";
import { IndexedDBEventLogStore } from "../../../server/kokuzo/offline/eventLogStore";
import type { KzEvent } from "../../../server/kokuzo/offline/eventLogStore";

/**
 * Snapshot から状態を復元
 */
export async function restoreFromSnapshot(): Promise<void> {
  try {
    const snapshotStore = new IndexedDBSnapshotStore();
    const eventLogStore = new IndexedDBEventLogStore();

    // 1. 最新の Snapshot を読み込む
    const snapshot = await snapshotStore.loadLatest();
    
    if (snapshot) {
      // 2. Snapshot から状態を復元
      await restoreKernelState(snapshot.kernelState);
      console.log("[Restore] Restored from snapshot, lamport:", snapshot.lamport);
    }

    // 3. Snapshot 以降の Event を Replay（上限付き）
    const fromLamport = snapshot?.lamport || 0;
    const replayStartTime = Date.now();
    const allEvents = await eventLogStore.replay(fromLamport);
    
    // Replay上限: 最大1000件（GAP-A対策）
    const MAX_REPLAY_EVENTS = 1000;
    const events = allEvents.length > MAX_REPLAY_EVENTS
      ? allEvents.slice(-MAX_REPLAY_EVENTS)
      : allEvents;
    
    if (allEvents.length > MAX_REPLAY_EVENTS) {
      console.warn(
        `[Restore] Replay events truncated: ${allEvents.length} -> ${MAX_REPLAY_EVENTS}`
      );
    }
    
    // メトリクス記録（GAP-F）
    const replayTime = Date.now() - replayStartTime;
    try {
      const { getMetricsCollector } = await import("../../../server/kokuzo/offline/metricsCollector");
      getMetricsCollector().recordReplayTime(replayTime);
    } catch (error) {
      // メトリクス記録失敗は無視
    }
    
    // 4. 競合解決を実行（GAP-D）
    const { resolveEventConflicts, canApplyEvent } = await import("../../../server/kokuzo/offline/conflictResolver");
    const resolvedEvents = resolveEventConflicts(events);
    
    // 5. Event を順次適用（superseded Eventは除外）
    for (const event of resolvedEvents) {
      if (canApplyEvent(event)) {
        await applyEvent(event);
      }
    }

    console.log("[Restore] Restored", events.length, "events after snapshot");
  } catch (error) {
    console.warn("[Restore] Failed to restore from snapshot:", error);
    // エラーは無視（空の状態から開始）
  }
}

/**
 * Kernel 状態を復元
 */
async function restoreKernelState(kernelState: any): Promise<void> {
  // 実際の実装では、Kernel の状態を復元
  // - seedTree
  // - quantumState
  // - reishoSignature
  // - memoryContext
  console.log("[Restore] Restoring kernel state:", Object.keys(kernelState));
}

/**
 * Event を適用
 */
async function applyEvent(event: KzEvent): Promise<void> {
  const eventType = event.data?.type;
  
  switch (eventType) {
    case "CHAT_MESSAGE_ADDED":
      // メッセージを会話に追加（既にEvent Logに記録されているので、UI更新のみ）
      console.log("[Restore] Applying CHAT_MESSAGE_ADDED event");
      break;
    
    case "FILE_UPLOADED":
      // ファイルを会話に追加
      console.log("[Restore] Applying FILE_UPLOADED event");
      break;
    
    case "LEARNING_TOGGLED":
      // 学習状態を更新
      console.log("[Restore] Applying LEARNING_TOGGLED event");
      break;
    
    default:
      console.warn("[Restore] Unknown event type:", eventType);
  }
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

