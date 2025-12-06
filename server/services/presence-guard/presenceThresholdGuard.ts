/**
 * Presence Threshold Guard
 * 
 * Presence OS v1.0の閾値変更を監視し、天聞の承認なしに変更されることを防ぐガードレイヤー。
 * 
 * 主な機能:
 * - 閾値変更の検知
 * - 承認なし変更の検知
 * - 閾値変更履歴の記録
 * - 天聞承認フロー
 */

import { getDb } from "../../db";
import { presenceThresholdChanges } from "../../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

/**
 * Presence OS v1.0の固定閾値
 */
export const PRESENCE_OS_V1_THRESHOLDS = {
  // Natural Presence Engine閾値
  naturalPresence: {
    CLEAR_DIRECTION_THRESHOLD: 10,
    NEUTRALITY_THRESHOLD: 82,
    MINIMUM_SAMPLES_FOR_TREND: 2,
    EMOTION_FIELD_PARAMS: {
      happy: { brightness: 90, warmth: 80, depth: 50 },
      sad: { brightness: 30, warmth: 20, depth: 90 },
      angry: { brightness: 70, warmth: 90, depth: 60 },
      anxious: { brightness: 50, warmth: 40, depth: 80 },
      calm: { brightness: 40, warmth: 50, depth: 70 },
      excited: { brightness: 95, warmth: 85, depth: 40 },
      neutral: { brightness: 60, warmth: 50, depth: 50 },
    },
  },
  // Hachigen Self-Healing Engine閾値
  hachiGen: {
    DIRECTION_WEIGHTS: {
      structure: 1.0,
      flow: 1.0,
      reiCore: 1.2,
      context: 1.0,
      intent: 1.0,
      environment: 0.8,
      temporal: 0.9,
      relation: 1.0,
    },
    FIRE_WATER_BALANCE_THRESHOLD: 10,
  },
} as const;

/**
 * 閾値変更リクエストの状態
 */
export type ThresholdChangeStatus = 'pending' | 'approved' | 'rejected';

/**
 * 閾値変更リクエスト
 */
export interface ThresholdChangeRequest {
  id?: number;
  userId: number;
  thresholdPath: string;  // 例: "naturalPresence.CLEAR_DIRECTION_THRESHOLD"
  currentValue: string;   // JSON文字列
  proposedValue: string;  // JSON文字列
  reason: string;
  status: ThresholdChangeStatus;
  approvedBy?: number;
  approvedAt?: Date;
  rejectedBy?: number;
  rejectedAt?: Date;
  createdAt?: Date;
}

/**
 * 閾値変更リクエストを作成
 */
export async function requestThresholdChange(
  userId: number,
  thresholdPath: string,
  proposedValue: unknown,
  reason: string
): Promise<ThresholdChangeRequest> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 現在の閾値を取得
  const currentValue = getThresholdByPath(thresholdPath);

  // リクエストを作成
  const request: ThresholdChangeRequest = {
    userId,
    thresholdPath,
    currentValue: JSON.stringify(currentValue),
    proposedValue: JSON.stringify(proposedValue),
    reason,
    status: 'pending',
  };

  // データベースに保存
  await db.insert(presenceThresholdChanges).values({
    userId,
    thresholdPath,
    currentValue: request.currentValue,
    proposedValue: request.proposedValue,
    reason,
    status: 'pending',
  });

  // 最後に挿入されたレコードを取得
  const inserted = await db
    .select()
    .from(presenceThresholdChanges)
    .where(eq(presenceThresholdChanges.userId, userId))
    .orderBy(desc(presenceThresholdChanges.createdAt))
    .limit(1);

  if (inserted.length === 0) {
    throw new Error("Failed to insert threshold change request");
  }

  return {
    ...request,
    id: inserted[0]!.id,
    createdAt: inserted[0]!.createdAt,
  };
}

/**
 * 閾値変更リクエストを承認
 */
export async function approveThresholdChange(
  requestId: number,
  approvedBy: number
): Promise<ThresholdChangeRequest> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // リクエストを取得
  const requests = await db
    .select()
    .from(presenceThresholdChanges)
    .where(eq(presenceThresholdChanges.id, requestId))
    .limit(1);

  if (requests.length === 0) {
    throw new Error(`Threshold change request not found: ${requestId}`);
  }

  const request = requests[0];

  if (request.status !== 'pending') {
    throw new Error(`Threshold change request is not pending: ${request.status}`);
  }

  // 承認
  await db
    .update(presenceThresholdChanges)
    .set({
      status: 'approved',
      approvedBy,
      approvedAt: new Date(),
    })
    .where(eq(presenceThresholdChanges.id, requestId));

  return {
    id: request.id,
    userId: request.userId,
    thresholdPath: request.thresholdPath,
    currentValue: request.currentValue,
    proposedValue: request.proposedValue,
    reason: request.reason,
    status: 'approved',
    approvedBy,
    approvedAt: new Date(),
    createdAt: request.createdAt,
  };
}

/**
 * 閾値変更リクエストを拒否
 */
export async function rejectThresholdChange(
  requestId: number,
  rejectedBy: number
): Promise<ThresholdChangeRequest> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // リクエストを取得
  const requests = await db
    .select()
    .from(presenceThresholdChanges)
    .where(eq(presenceThresholdChanges.id, requestId))
    .limit(1);

  if (requests.length === 0) {
    throw new Error(`Threshold change request not found: ${requestId}`);
  }

  const request = requests[0];

  if (request.status !== 'pending') {
    throw new Error(`Threshold change request is not pending: ${request.status}`);
  }

  // 拒否
  await db
    .update(presenceThresholdChanges)
    .set({
      status: 'rejected',
      rejectedBy,
      rejectedAt: new Date(),
    })
    .where(eq(presenceThresholdChanges.id, requestId));

  return {
    id: request.id,
    userId: request.userId,
    thresholdPath: request.thresholdPath,
    currentValue: request.currentValue,
    proposedValue: request.proposedValue,
    reason: request.reason,
    status: 'rejected',
    rejectedBy,
    rejectedAt: new Date(),
    createdAt: request.createdAt,
  };
}

/**
 * 閾値変更履歴を取得
 */
export async function getThresholdChangeHistory(
  limit: number = 50
): Promise<ThresholdChangeRequest[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const results = await db
    .select()
    .from(presenceThresholdChanges)
    .orderBy(desc(presenceThresholdChanges.createdAt))
    .limit(limit);

  return results.map(r => ({
    id: r.id,
    userId: r.userId,
    thresholdPath: r.thresholdPath,
    currentValue: r.currentValue,
    proposedValue: r.proposedValue,
    reason: r.reason,
    status: r.status as ThresholdChangeStatus,
    approvedBy: r.approvedBy ?? undefined,
    approvedAt: r.approvedAt ?? undefined,
    rejectedBy: r.rejectedBy ?? undefined,
    rejectedAt: r.rejectedAt ?? undefined,
    createdAt: r.createdAt,
  }));
}

/**
 * 現在の閾値を取得
 */
export function getCurrentThresholds() {
  return PRESENCE_OS_V1_THRESHOLDS;
}

/**
 * パスから閾値を取得
 */
function getThresholdByPath(path: string): unknown {
  const parts = path.split('.');
  let current: unknown = PRESENCE_OS_V1_THRESHOLDS;

  for (const part of parts) {
    if (typeof current === 'object' && current !== null && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      throw new Error(`Threshold path not found: ${path}`);
    }
  }

  return current;
}

/**
 * 承認なし変更を検知
 */
export async function detectUnauthorizedChange(
  thresholdPath: string,
  actualValue: unknown
): Promise<boolean> {
  const expectedValue = getThresholdByPath(thresholdPath);
  
  // 値を比較
  const isUnauthorized = JSON.stringify(expectedValue) !== JSON.stringify(actualValue);
  
  if (isUnauthorized) {
    console.warn(`[Presence Guard] Unauthorized threshold change detected: ${thresholdPath}`);
    console.warn(`Expected: ${JSON.stringify(expectedValue)}`);
    console.warn(`Actual: ${JSON.stringify(actualValue)}`);
  }
  
  return isUnauthorized;
}

/**
 * 閾値変更を記録
 */
export async function recordThresholdChange(
  userId: number,
  thresholdPath: string,
  oldValue: unknown,
  newValue: unknown,
  reason: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.insert(presenceThresholdChanges).values({
    userId,
    thresholdPath,
    currentValue: JSON.stringify(oldValue),
    proposedValue: JSON.stringify(newValue),
    reason,
    status: 'approved',  // 記録のみの場合は承認済みとして扱う
    approvedBy: userId,
    approvedAt: new Date(),
  });
}
