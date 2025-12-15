/**
 * ============================================================
 *  OFFLINE STATE MACHINE — オフライン状態機械
 * ============================================================
 * 
 * オフライン/オンライン状態の管理
 * ============================================================
 */

export type OfflineState = "ONLINE" | "OFFLINE_CLEAN" | "OFFLINE_DIRTY" | "SYNCING";

export interface OfflineStateMachine {
  getState(): OfflineState;
  setOffline(): void;
  markDirty(): void;
  markSynced(): void;
  setOnline(): void;
  onStateChange(callback: (state: OfflineState) => void): void;
}

/**
 * オフライン状態機械の実装
 */
export class OfflineStateMachineImpl implements OfflineStateMachine {
  private state: OfflineState = "ONLINE";
  private listeners: Array<(state: OfflineState) => void> = [];

  getState(): OfflineState {
    return this.state;
  }

  setOffline(): void {
    if (this.state === "ONLINE") {
      this.setState("OFFLINE_CLEAN");
    }
  }

  markDirty(): void {
    if (this.state === "OFFLINE_CLEAN") {
      this.setState("OFFLINE_DIRTY");
    }
  }

  markSynced(): void {
    if (this.state === "SYNCING") {
      this.setState("ONLINE");
    }
  }

  setOnline(): void {
    if (this.state === "OFFLINE_CLEAN" || this.state === "OFFLINE_DIRTY") {
      if (this.state === "OFFLINE_DIRTY") {
        this.setState("SYNCING");
      } else {
        this.setState("ONLINE");
      }
    }
  }

  private setState(newState: OfflineState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.notifyListeners(newState);
    }
  }

  onStateChange(callback: (state: OfflineState) => void): void {
    this.listeners.push(callback);
  }

  private notifyListeners(state: OfflineState): void {
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (error) {
        console.error("Error in state change listener:", error);
      }
    }
  }
}

/**
 * ネットワーク切断をフックしてオフライン状態に設定
 */
export function hookNetworkDisconnect(
  stateMachine: OfflineStateMachine
): void {
  if (typeof window !== "undefined") {
    window.addEventListener("offline", () => {
      stateMachine.setOffline();
    });

    window.addEventListener("online", () => {
      stateMachine.setOnline();
    });
  }
}

/**
 * ローカルミューテーションをフックして DIRTY 状態にマーク
 */
export function hookLocalMutation(
  stateMachine: OfflineStateMachine,
  eventLogStore: any
): void {
  // イベントが追加されたときに DIRTY 状態にマーク
  // 実際の実装では、eventLogStore の append メソッドをラップ
  // const originalAppend = eventLogStore.append.bind(eventLogStore);
  // eventLogStore.append = async (event: any) => {
  //   const result = await originalAppend(event);
  //   if (stateMachine.getState() === "OFFLINE_CLEAN") {
  //     stateMachine.markDirty();
  //   }
  //   return result;
  // };
}

/**
 * 同期成功をフックして SYNCED 状態にマーク
 */
export function hookSuccessfulSync(
  stateMachine: OfflineStateMachine,
  syncFabric: any
): void {
  // 同期成功時に SYNCED 状態にマーク
  // 実際の実装では、syncFabric の onSyncSuccess コールバックを使用
  // syncFabric.onSyncSuccess(() => {
  //   stateMachine.markSynced();
  // });
}

export default {
  OfflineStateMachineImpl,
  hookNetworkDisconnect,
  hookLocalMutation,
  hookSuccessfulSync,
};

