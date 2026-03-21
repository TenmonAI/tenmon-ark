/**
 * クライアント本番ビルド専用: `server/kokuzo/offline/*` への import を 1 モジュールに集約。
 * 実装は最小（永続化・サーバー同期は no-op）。本番ロジックはサーバー／将来の shared 層へ。
 */

export type OfflineState =
  | "ONLINE"
  | "OFFLINE_CLEAN"
  | "OFFLINE_DIRTY"
  | "SYNCING";

export interface OfflineStateMachine {
  getState(): OfflineState;
  setOffline(): void;
  markDirty(): void;
  markSynced(): void;
  setOnline(): void;
  onStateChange(callback: (state: OfflineState) => void): void;
}

// --- eventLogStore ---

export type KzEventKind =
  | "semanticUnitCreated"
  | "fractalSeedCreated"
  | "seedTreeUpdated"
  | "reishoSignatureUpdated"
  | "conversationAdded"
  | "memoryRetrieved"
  | "offlineMutation";

export interface KzEvent {
  id: string;
  kind: KzEventKind;
  timestamp: number;
  lamport: number;
  deviceId?: string;
  devicePriority?: number;
  data: unknown;
  previousHash?: string;
  hash: string;
  sent: boolean;
  superseded?: boolean;
  supersededBy?: string;
  supersededReason?: string;
}

export interface EventLogStore {
  append(
    event: Omit<KzEvent, "id" | "hash" | "previousHash" | "lamport">,
  ): Promise<KzEvent>;
  getUnsent(): Promise<KzEvent[]>;
  markSent(eventId: string): Promise<void>;
  replay(fromLamport?: number): Promise<KzEvent[]>;
  verifyIntegrity(): Promise<boolean>;
  getLatestLamport(): Promise<number>;
}

export class IndexedDBEventLogStore implements EventLogStore {
  private lamport = 0;

  async append(
    event: Omit<KzEvent, "id" | "hash" | "previousHash" | "lamport">,
  ): Promise<KzEvent> {
    this.lamport += 1;
    const kz: KzEvent = {
      ...event,
      id: `stub-${Date.now()}`,
      lamport: this.lamport,
      previousHash: undefined,
      hash: "stub",
      sent: false,
    };
    return kz;
  }

  async getUnsent(): Promise<KzEvent[]> {
    return [];
  }

  async markSent(): Promise<void> {}

  async replay(): Promise<KzEvent[]> {
    return [];
  }

  async verifyIntegrity(): Promise<boolean> {
    return true;
  }

  async getLatestLamport(): Promise<number> {
    return this.lamport;
  }
}

export function createEventLogStore(): EventLogStore {
  return new IndexedDBEventLogStore();
}

// --- offlineStateMachine ---

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

  onStateChange(callback: (state: OfflineState) => void): void {
    this.listeners.push(callback);
  }

  private setState(newState: OfflineState): void {
    if (this.state !== newState) {
      this.state = newState;
      for (const listener of this.listeners) {
        try {
          listener(newState);
        } catch {
          /* ignore */
        }
      }
    }
  }
}

export function hookNetworkDisconnect(_stateMachine: OfflineStateMachine): void {}
export function hookLocalMutation(_sm: OfflineStateMachine, _store: unknown): void {}
export function hookSuccessfulSync(_sm: OfflineStateMachine, _fabric: unknown): void {}

// --- syncFabric ---

export class SyncFabricImpl {
  constructor(
    _eventLogStore: EventLogStore,
    _stateMachine: OfflineStateMachine,
  ) {}

  async onReconnect(): Promise<void> {}

  async pushEvents(_events: KzEvent[]): Promise<boolean> {
    return true;
  }

  onSyncSuccess(_callback: () => void): void {}

  onSyncFailure(_callback: () => void): void {}
}

// --- snapshotStore ---

export interface KzSnapshot {
  id: string;
  lamport: number;
  timestamp: number;
  kernelState: {
    seedTree: unknown;
    quantumState: unknown;
    reishoSignature: unknown;
    memoryContext: unknown;
  };
  hash: string;
}

export interface SnapshotStore {
  save(snapshot: KzSnapshot): Promise<void>;
  loadLatest(): Promise<KzSnapshot | null>;
  loadByLamport(lamport: number): Promise<KzSnapshot | null>;
  deleteOlderThan(lamport: number): Promise<void>;
}

export class IndexedDBSnapshotStore implements SnapshotStore {
  async save(): Promise<void> {}

  async loadLatest(): Promise<KzSnapshot | null> {
    return null;
  }

  async loadByLamport(): Promise<KzSnapshot | null> {
    return null;
  }

  async deleteOlderThan(): Promise<void> {}
}

// --- metricsCollector ---

export function getMetricsCollector() {
  return {
    recordReplayTime(_timeMs: number): void {},
    recordSyncSuccess(): void {},
    recordSyncFailure(): void {},
  };
}

// --- conflictResolver ---

export function resolveEventConflicts<T>(events: T[]): T[] {
  return events;
}

export function canApplyEvent(_event: unknown): boolean {
  return true;
}

// --- seedBundle ---

export async function storeSeedBundleInLocalKokuzo(
  _bundle: unknown,
  _localKokuzoKernel: unknown,
): Promise<void> {}

export async function indexSeedBundleForFastOfflineLookup(
  _bundle: unknown,
  _localKokuzoKernel: unknown,
): Promise<void> {}

// --- localKokuzoKernel ---

export class LocalKokuzoKernel {
  async appendEvent(_event: {
    type: string;
    conversationId?: number;
    fileId?: number;
    enabled?: boolean;
    projectId?: number | null;
    payload?: unknown;
  }): Promise<void> {}
}

export default {
  createEventLogStore,
  IndexedDBEventLogStore,
  OfflineStateMachineImpl,
  SyncFabricImpl,
};
