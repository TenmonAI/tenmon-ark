/**
 * ============================================================
 *  SYNC FABRIC — 止まらない同期
 * ============================================================
 * 
 * オンライン復帰時のイベントレプリケーション
 * ============================================================
 */

import type { KzEvent } from "./eventLogStore";
import type { OfflineStateMachine } from "./offlineStateMachine";

export interface SyncFabric {
  onReconnect(): Promise<void>;
  pushEvents(events: KzEvent[]): Promise<boolean>;
  onSyncSuccess(callback: () => void): void;
  onSyncFailure(callback: () => void): void;
}

/**
 * 同期ファブリックの実装
 */
export class SyncFabricImpl implements SyncFabric {
  private eventLogStore: any;
  private stateMachine: OfflineStateMachine;
  private syncSuccessCallbacks: Array<() => void> = [];
  private syncFailureCallbacks: Array<() => void> = [];
  private sentEventIds: Set<string> = new Set();

  constructor(eventLogStore: any, stateMachine: OfflineStateMachine) {
    this.eventLogStore = eventLogStore;
    this.stateMachine = stateMachine;
  }

  /**
   * 再接続時にイベントをレプリケーション
   */
  async onReconnect(): Promise<void> {
    if (this.stateMachine.getState() !== "OFFLINE_DIRTY") {
      return;
    }

    const unsentEvents = await this.eventLogStore.getUnsent();
    
    if (unsentEvents.length === 0) {
      this.stateMachine.markSynced();
      return;
    }

    // 競合解決を実行（GAP-D）
    const { resolveEventConflicts } = await import("./conflictResolver");
    const resolvedEvents = resolveEventConflicts(unsentEvents);

    // 非ブロッキングでプッシュ（superseded Eventは除外）
    const eventsToPush = resolvedEvents.filter((e) => !(e as any).superseded);
    const success = await this.pushEvents(eventsToPush);
    
    if (success) {
      this.notifySyncSuccess();
      this.stateMachine.markSynced();
    } else {
      this.notifySyncFailure();
      // 失敗時は OFFLINE_DIRTY に戻る
      this.stateMachine.setOffline();
      this.stateMachine.markDirty();
    }
  }

  /**
   * イベントをプッシュ（非ブロッキング）
   */
  async pushEvents(events: KzEvent[]): Promise<boolean> {
    try {
      // 重複送信を防ぐ（event ID でチェック）
      const uniqueEvents = events.filter(
        (e) => !this.sentEventIds.has(e.id)
      );

      if (uniqueEvents.length === 0) {
        return true;
      }

      // サーバーに送信
      const response = await this.sendToServer(uniqueEvents);

      if (response.success) {
        // 送信成功したイベントをマーク
        for (const event of uniqueEvents) {
          await this.eventLogStore.markSent(event.id);
          this.sentEventIds.add(event.id);
        }
        
        // メトリクス記録（GAP-F）
        try {
          const { getMetricsCollector } = await import("./metricsCollector");
          getMetricsCollector().recordSyncSuccess();
        } catch (error) {
          // メトリクス記録失敗は無視
        }
        
        return true;
      } else {
        // メトリクス記録（GAP-F）
        try {
          const { getMetricsCollector } = await import("./metricsCollector");
          getMetricsCollector().recordSyncFailure();
        } catch (error) {
          // メトリクス記録失敗は無視
        }
        
        return false;
      }
    } catch (error) {
      console.error("Error pushing events:", error);
      return false;
    }
  }

  /**
   * サーバーにイベントを送信
   */
  private async sendToServer(events: KzEvent[]): Promise<{ success: boolean }> {
    // 実際の実装では、API エンドポイントに送信
    // const response = await fetch("/api/kokuzo/sync/events", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ events }),
    // });
    // return { success: response.ok };
    
    // モック実装
    return { success: true };
  }

  /**
   * 同期成功コールバックを登録
   */
  onSyncSuccess(callback: () => void): void {
    this.syncSuccessCallbacks.push(callback);
  }

  /**
   * 同期失敗コールバックを登録
   */
  onSyncFailure(callback: () => void): void {
    this.syncFailureCallbacks.push(callback);
  }

  /**
   * 同期成功を通知
   */
  private notifySyncSuccess(): void {
    for (const callback of this.syncSuccessCallbacks) {
      try {
        callback();
      } catch (error) {
        console.error("Error in sync success callback:", error);
      }
    }
  }

  /**
   * 同期失敗を通知
   */
  private notifySyncFailure(): void {
    for (const callback of this.syncFailureCallbacks) {
      try {
        callback();
      } catch (error) {
        console.error("Error in sync failure callback:", error);
      }
    }
  }
}

export default {
  SyncFabricImpl,
};

