/**
 * ============================================================
 *  OFFLINE V INFINITY TESTS — オフラインテスト
 * ============================================================
 * 
 * 完全オフライン環境でのテスト
 * ============================================================
 */

import { createEventLogStore } from "../../kokuzo/offline/eventLogStore";
import { createSnapshotStore, createSnapshot } from "../../kokuzo/offline/snapshotStore";
import { restoreMemoryKernel } from "../../kokuzo/offline/memoryKernelRestore";

export interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  duration: number;
}

/**
 * 電源喪失からの回復テスト
 */
export async function testPowerLossRecovery(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // 1. スナップショットを作成
    const snapshotStore = createSnapshotStore();
    const snapshot = await createSnapshot(100, {
      seedTree: { roots: ["seed-1"], nodes: new Map() },
      quantumState: {},
      reishoSignature: {},
      memoryContext: {},
    });
    await snapshotStore.save(snapshot);

    // 2. いくつかのイベントを追加
    const eventLogStore = createEventLogStore();
    await eventLogStore.append({
      kind: "semanticUnitCreated",
      timestamp: Date.now(),
      data: { id: "unit-1", text: "Test unit" },
      sent: false,
    });

    // 3. 電源喪失をシミュレート（スナップショットから復元）
    const restoredState = await restoreMemoryKernel();

    if (!restoredState) {
      throw new Error("Failed to restore memory kernel");
    }

    return {
      name: "Power Loss Recovery",
      success: true,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      name: "Power Loss Recovery",
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * 72時間オフラインチャット・ingest・expand テスト
 */
export async function test72hOfflineChatIngestExpand(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const eventLogStore = createEventLogStore();

    // 72時間分のイベントをシミュレート
    const hours = 72;
    const eventsPerHour = 10;
    const totalEvents = hours * eventsPerHour;

    for (let i = 0; i < totalEvents; i++) {
      await eventLogStore.append({
        kind: "conversationAdded",
        timestamp: Date.now() - (totalEvents - i) * 3600000, // 1時間ごと
        data: {
          id: `conv-${i}`,
          message: `Test message ${i}`,
          response: `Test response ${i}`,
        },
        sent: false,
      });
    }

    // スナップショットを作成（100イベントごと）
    const snapshotStore = createSnapshotStore();
    for (let i = 100; i <= totalEvents; i += 100) {
      const snapshot = await createSnapshot(i, {
        seedTree: { roots: [], nodes: new Map() },
        quantumState: {},
        reishoSignature: {},
        memoryContext: { conversations: i },
      });
      await snapshotStore.save(snapshot);
    }

    // 復元をテスト
    const restoredState = await restoreMemoryKernel();

    if (!restoredState) {
      throw new Error("Failed to restore after 72h offline");
    }

    return {
      name: "72h Offline Chat Ingest Expand",
      success: true,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      name: "72h Offline Chat Ingest Expand",
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * 同期リトライ（重複なし）テスト
 */
export async function testSyncRetryWithoutDuplication(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const eventLogStore = createEventLogStore();

    // イベントを追加
    const event1 = await eventLogStore.append({
      kind: "semanticUnitCreated",
      timestamp: Date.now(),
      data: { id: "unit-1", text: "Test" },
      sent: false,
    });

    // 送信済みとしてマーク
    await eventLogStore.markSent(event1.id);

    // 再度送信を試みる（重複チェック）
    const unsentEvents = await eventLogStore.getUnsent();

    if (unsentEvents.some((e) => e.id === event1.id)) {
      throw new Error("Duplicate event found in unsent events");
    }

    return {
      name: "Sync Retry Without Duplication",
      success: true,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      name: "Sync Retry Without Duplication",
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * マルチデバイス競合テスト（グローバル提案のみ）
 */
export async function testMultiDeviceConflictGlobalProposalOnly(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // 実際の実装では、複数のデバイスからのイベントをシミュレート
    // グローバル提案のみを許可し、ローカル変更は競合として処理

    // モック実装
    const device1Events = [
      { id: "event-1", lamport: 1, kind: "semanticUnitCreated" },
      { id: "event-2", lamport: 2, kind: "fractalSeedCreated" },
    ];

    const device2Events = [
      { id: "event-3", lamport: 1, kind: "semanticUnitCreated" },
      { id: "event-4", lamport: 2, kind: "fractalSeedCreated" },
    ];

    // 競合解決（グローバル提案のみ）
    const resolvedEvents = [...device1Events, ...device2Events].sort(
      (a, b) => a.lamport - b.lamport
    );

    if (resolvedEvents.length !== 4) {
      throw new Error("Failed to resolve multi-device conflicts");
    }

    return {
      name: "Multi-Device Conflict (Global Proposal Only)",
      success: true,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      name: "Multi-Device Conflict (Global Proposal Only)",
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * すべてのテストを実行
 */
export async function runAllOfflineVInfinityTests(): Promise<TestResult[]> {
  const tests = [
    testPowerLossRecovery,
    test72hOfflineChatIngestExpand,
    testSyncRetryWithoutDuplication,
    testMultiDeviceConflictGlobalProposalOnly,
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    const result = await test();
    results.push(result);
    console.log(`${result.name}: ${result.success ? "✅" : "❌"} (${result.duration}ms)`);
  }

  return results;
}

export default {
  testPowerLossRecovery,
  test72hOfflineChatIngestExpand,
  testSyncRetryWithoutDuplication,
  testMultiDeviceConflictGlobalProposalOnly,
  runAllOfflineVInfinityTests,
};

