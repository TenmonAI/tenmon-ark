/**
 * ============================================================
 *  CONFLICT RESOLVER — デバイス競合解決
 * ============================================================
 * 
 * 複数デバイスから同時に発生した Event の衝突を自動解決
 * UIに一切露出させない
 * ============================================================
 */

import type { KzEvent } from "./eventLogStore";

/**
 * デバイス優先度（高い方が優先）
 */
export const DEVICE_PRIORITY = {
  SERVER: 100,      // サーバー（最高優先度）
  DESKTOP: 50,      // デスクトップ
  MOBILE: 30,       // モバイル
  TABLET: 40,       // タブレット
  UNKNOWN: 10,      // 不明
} as const;

/**
 * 競合判定: 同一対象かどうかを判定
 */
function isSameTarget(event1: KzEvent, event2: KzEvent): boolean {
  const data1 = event1.data || {};
  const data2 = event2.data || {};

  // 同じ種類のイベントで、同じ対象を操作しているか
  if (event1.kind !== event2.kind) {
    return false;
  }

  // 種類ごとの競合判定
  switch (event1.kind) {
    case "offlineMutation":
      // 同一ファイルの学習ON/OFF
      if (data1.type === "LEARNING_TOGGLED" && data2.type === "LEARNING_TOGGLED") {
        return data1.fileId === data2.fileId;
      }
      // 同一会話のメッセージ追加（通常は競合しないが、念のため）
      if (data1.type === "CHAT_MESSAGE_ADDED" && data2.type === "CHAT_MESSAGE_ADDED") {
        return data1.conversationId === data2.conversationId;
      }
      // 同一ファイルのアップロード（通常は競合しないが、念のため）
      if (data1.type === "FILE_UPLOADED" && data2.type === "FILE_UPLOADED") {
        return data1.fileId === data2.fileId;
      }
      // ingest 成功/失敗（同一ファイル）
      if (
        (data1.type === "INGEST_SUCCESS" || data1.type === "INGEST_FAILURE") &&
        (data2.type === "INGEST_SUCCESS" || data2.type === "INGEST_FAILURE")
      ) {
        return data1.fileId === data2.fileId;
      }
      break;

    case "semanticUnitCreated":
      // 同一 SemanticUnit ID
      return data1.unitId === data2.unitId;

    case "fractalSeedCreated":
      // 同一 FractalSeed ID
      return data1.seedId === data2.seedId;

    default:
      return false;
  }

  return false;
}

/**
 * Event の優先順位を比較
 * @returns 1: event1 が優先, -1: event2 が優先, 0: 同値
 */
function compareEventPriority(event1: KzEvent, event2: KzEvent): number {
  // 1. lamport が大きい方が優先
  if (event1.lamport > event2.lamport) {
    return 1;
  }
  if (event1.lamport < event2.lamport) {
    return -1;
  }

  // 2. lamport が同値なら devicePriority が高い方が優先
  const priority1 = event1.devicePriority || DEVICE_PRIORITY.UNKNOWN;
  const priority2 = event2.devicePriority || DEVICE_PRIORITY.UNKNOWN;

  if (priority1 > priority2) {
    return 1;
  }
  if (priority1 < priority2) {
    return -1;
  }

  // 3. それでも同値なら timestamp が新しい方が優先
  if (event1.timestamp > event2.timestamp) {
    return 1;
  }
  if (event1.timestamp < event2.timestamp) {
    return -1;
  }

  return 0;
}

/**
 * Event の競合を解決
 * 
 * 同一対象で競合した場合:
 * - lamport が大きい方を正
 * - 同値なら devicePriority が高い方
 * - 負けたEventは "superseded" フラグを付ける（削除しない）
 */
export function resolveEventConflicts(events: KzEvent[]): KzEvent[] {
  // 競合グループを作成
  const conflictGroups = new Map<string, KzEvent[]>();

  // 各Eventを競合グループに分類
  for (const event of events) {
    // 既に superseded されているEventはスキップ
    if ((event as any).superseded) {
      continue;
    }

    // 競合キーを生成（種類 + 対象ID）
    const conflictKey = getConflictKey(event);

    if (!conflictGroups.has(conflictKey)) {
      conflictGroups.set(conflictKey, []);
    }
    conflictGroups.get(conflictKey)!.push(event);
  }

  // 各競合グループで解決
  const resolvedEvents: KzEvent[] = [];

  for (const [conflictKey, group] of conflictGroups.entries()) {
    if (group.length === 1) {
      // 競合なし
      resolvedEvents.push(group[0]);
      continue;
    }

    // 競合あり: 優先順位でソート
    group.sort((a, b) => -compareEventPriority(a, b)); // 降順（優先度が高い順）

    // 最初のEvent（最優先）を正として採用
    const winner = group[0];
    resolvedEvents.push(winner);

    // 残りのEventに "superseded" フラグを付ける（削除しない）
    for (let i = 1; i < group.length; i++) {
      const loser = group[i];
      (loser as any).superseded = true;
      (loser as any).supersededBy = winner.id;
      (loser as any).supersededReason = `Conflicted with event ${winner.id} (lamport: ${winner.lamport}, priority: ${winner.devicePriority})`;
      
      // superseded Eventも保持（削除禁止）
      resolvedEvents.push(loser);
    }
  }

  return resolvedEvents;
}

/**
 * 競合キーを生成
 */
function getConflictKey(event: KzEvent): string {
  const data = event.data || {};

  switch (event.kind) {
    case "offlineMutation":
      if (data.type === "LEARNING_TOGGLED") {
        return `LEARNING_TOGGLED:${data.fileId}`;
      }
      if (data.type === "CHAT_MESSAGE_ADDED") {
        // メッセージ追加は通常競合しないが、念のため
        return `CHAT_MESSAGE_ADDED:${data.conversationId}:${data.messageId}`;
      }
      if (data.type === "FILE_UPLOADED") {
        return `FILE_UPLOADED:${data.fileId}`;
      }
      if (data.type === "INGEST_SUCCESS" || data.type === "INGEST_FAILURE") {
        return `INGEST:${data.fileId}`;
      }
      break;

    case "semanticUnitCreated":
      return `semanticUnitCreated:${data.unitId}`;

    case "fractalSeedCreated":
      return `fractalSeedCreated:${data.seedId}`;

    default:
      return `${event.kind}:${event.id}`;
  }

  return `${event.kind}:${event.id}`;
}

/**
 * Event が superseded されているかチェック
 */
export function isSuperseded(event: KzEvent): boolean {
  return !!(event as any).superseded;
}

/**
 * Event を適用可能かチェック（superseded されていないか）
 */
export function canApplyEvent(event: KzEvent): boolean {
  return !isSuperseded(event);
}

