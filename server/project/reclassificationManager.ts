/**
 * ============================================================
 *  RECLASSIFICATION MANAGER — プロジェクト再分類管理
 * ============================================================
 * 
 * 長期利用でも破綻させない自動分類の永続検証
 * ============================================================
 */

import { getDb } from "../db";
import { projects, chatRooms } from "../../drizzle/schema";
import { eq, and, lt, gte, desc } from "drizzle-orm";
import { autoClassifyProject, type ClassificationResult } from "./autoClassifier";

/**
 * 再評価設定
 */
export interface ReclassificationConfig {
  /** 再評価間隔（ミリ秒） */
  reclassificationInterval: number; // デフォルト: 30日
  /** 仮Projectの confidence 閾値 */
  temporaryProjectThreshold: number; // デフォルト: 0.6
  /** 再評価対象の最小 confidence */
  minConfidenceForReclassification: number; // デフォルト: 0.3
}

const DEFAULT_CONFIG: ReclassificationConfig = {
  reclassificationInterval: 30 * 24 * 60 * 60 * 1000, // 30日
  temporaryProjectThreshold: 0.6,
  minConfidenceForReclassification: 0.3,
};

/**
 * 仮Projectかどうかを判定
 */
export function isTemporaryProject(confidence: number, config: Partial<ReclassificationConfig> = {}): boolean {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  return confidence < cfg.temporaryProjectThreshold;
}

/**
 * 再評価が必要かチェック
 */
export function needsReclassification(
  lastClassifiedAt: number,
  config: Partial<ReclassificationConfig> = {}
): boolean {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();
  return now - lastClassifiedAt >= cfg.reclassificationInterval;
}

/**
 * 会話を再分類
 */
export async function reclassifyRoom(
  roomId: number,
  userId: number,
  config: Partial<ReclassificationConfig> = {}
): Promise<ClassificationResult | null> {
  const db = await getDb();
  if (!db) return null;

  // ルームを取得
  const room = await db
    .select()
    .from(chatRooms)
    .where(
      and(
        eq(chatRooms.id, roomId),
        eq(chatRooms.userId, userId)
      )
    )
    .limit(1);

  if (room.length === 0) {
    return null;
  }

  const currentRoom = room[0];

  // 手動固定されている場合は再分類しない
  if (currentRoom.projectLocked === "manual") {
    return null;
  }

  // 会話のメッセージを取得
  const { getRecentChatMessages } = await import("../chat/chatDb");
  const messages = await getRecentChatMessages(roomId, 10);
  const conversationHistory = messages.map((m) => m.content);

  // 自動分類を実行
  const classification = await autoClassifyProject({
    text: currentRoom.title || "",
    conversationHistory,
    userId,
    conversationId: roomId,
    roomId,
  });

  // 仮Projectとして扱う（confidence < 0.6）
  const isTemporary = isTemporaryProject(classification.confidence, config);

  // ルームの projectId と classificationConfidence を更新
  await db
    .update(chatRooms)
    .set({
      projectId: classification.projectId,
      classificationConfidence: Math.round(classification.confidence * 100), // 0-100 に変換
      classificationLastUpdated: new Date(),
      isTemporaryProject: isTemporary ? 1 : 0,
    })
    .where(eq(chatRooms.id, roomId));

  return classification;
}

/**
 * 再評価が必要なルームをバッチで再分類
 */
export async function batchReclassifyRooms(
  userId: number,
  config: Partial<ReclassificationConfig> = {}
): Promise<{
  reclassified: number;
  skipped: number;
  errors: number;
}> {
  const db = await getDb();
  if (!db) {
    return { reclassified: 0, skipped: 0, errors: 0 };
  }

  const cfg = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();
  const threshold = now - cfg.reclassificationInterval;

  // 再評価が必要なルームを取得
  // - projectLocked = "auto" のみ
  // - classificationLastUpdated が null または threshold より古い
  // - classificationConfidence < minConfidenceForReclassification の場合も対象
  const allRooms = await db
    .select()
    .from(chatRooms)
    .where(
      and(
        eq(chatRooms.userId, userId),
        eq(chatRooms.projectLocked, "auto")
      )
    )
    .orderBy(desc(chatRooms.updatedAt))
    .limit(100); // 一度に処理する最大数

  // フィルタリング（classificationLastUpdated が null または threshold より古い、または confidence が低い）
  const roomsToReclassify = allRooms.filter((room) => {
    const lastClassifiedAt = room.classificationLastUpdated
      ? room.classificationLastUpdated.getTime()
      : room.createdAt.getTime();
    
    const needsReclass = needsReclassification(lastClassifiedAt, config) ||
      (room.classificationConfidence !== null && room.classificationConfidence < cfg.minConfidenceForReclassification * 100);
    
    return needsReclass;
  });

  let reclassified = 0;
  let skipped = 0;
  let errors = 0;

  for (const room of roomsToReclassify) {
    try {
      // 再評価が必要かチェック
      const lastClassifiedAt = room.classificationLastUpdated
        ? room.classificationLastUpdated.getTime()
        : room.createdAt.getTime();

      const needsReclass = needsReclassification(lastClassifiedAt, config) ||
        (room.classificationConfidence !== null && room.classificationConfidence < cfg.minConfidenceForReclassification * 100);

      if (!needsReclass) {
        skipped++;
        continue;
      }

      // 再分類を実行
      const result = await reclassifyRoom(room.id, userId, config);
      if (result) {
        reclassified++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`[Reclassification] Error reclassifying room ${room.id}:`, error);
      errors++;
    }
  }

  return { reclassified, skipped, errors };
}

/**
 * 仮Projectを統合（低 confidence の Project を統合）
 */
export async function consolidateTemporaryProjects(
  userId: number,
  config: Partial<ReclassificationConfig> = {}
): Promise<{
  consolidated: number;
  merged: number;
}> {
  const db = await getDb();
  if (!db) {
    return { consolidated: 0, merged: 0 };
  }

  const cfg = { ...DEFAULT_CONFIG, ...config };

  // 仮Project（isTemporaryProject = 1）を取得
  const temporaryProjects = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        eq(projects.isTemporaryProject, 1)
      )
    )
    .orderBy(desc(projects.updatedAt));

  if (temporaryProjects.length === 0) {
    return { consolidated: 0, merged: 0 };
  }

  // デフォルトプロジェクトを取得
  const { getOrCreateDefaultProject } = await import("../routers/projectRouter");
  const defaultProjectId = await getOrCreateDefaultProject(userId);

  let merged = 0;

  // 各仮Projectのルームをデフォルトプロジェクトに統合
  for (const tempProject of temporaryProjects) {
    const rooms = await db
      .select()
      .from(chatRooms)
      .where(
        and(
          eq(chatRooms.userId, userId),
          eq(chatRooms.projectId, tempProject.id),
          eq(chatRooms.projectLocked, "auto") // 手動固定は除外
        )
      );

    for (const room of rooms) {
      await db
        .update(chatRooms)
        .set({
          projectId: defaultProjectId,
          classificationConfidence: 0.5, // デフォルトプロジェクトの confidence
          classificationLastUpdated: new Date(),
        })
        .where(eq(chatRooms.id, room.id));

      merged++;
    }

    // 仮Projectを削除（論理削除）
    await db
      .update(projects)
      .set({
        isTemporaryProject: 0, // 統合済み
        updatedAt: new Date(),
      })
      .where(eq(projects.id, tempProject.id));
  }

  return { consolidated: temporaryProjects.length, merged };
}

