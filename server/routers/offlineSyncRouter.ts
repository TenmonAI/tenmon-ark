/**
 * ============================================================
 *  OFFLINE SYNC ROUTER — オフライン同期ルーター
 * ============================================================
 * 
 * オフライン時の変更をサーバー側でレビュー・マージ
 * ============================================================
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import type { DiffPayload } from "../sync/offline/syncDiffController";

const diffPayloadSchema = z.object({
  userId: z.string(),
  offlineEvents: z.array(z.object({
    type: z.enum(["innerReflectionLog", "newLocalSemanticUnit", "newLocalSeed", "personaChange"]),
    timestamp: z.number(),
    data: z.any(),
  })),
  localSemanticUnits: z.array(z.object({
    id: z.string(),
    text: z.string(),
    metadata: z.any().optional(),
  })),
  localSeeds: z.array(z.object({
    id: z.string(),
    semanticUnitIds: z.array(z.string()),
    compressedRepresentation: z.any(),
  })),
  syncTimestamp: z.number(),
});

export const offlineSyncRouter = router({
  /**
   * 差分をサーバーに送信してレビュー・マージ
   */
  syncDiff: protectedProcedure
    .input(diffPayloadSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. 差分をレビュー
      const reviewResult = await reviewDiff(input);

      // 2. マージ可能な場合はマージ
      if (reviewResult.canMerge) {
        await mergeDiff(ctx.user.id, input);
      }

      return {
        success: true,
        reviewResult,
        merged: reviewResult.canMerge,
      };
    }),

  /**
   * オフライン状態を取得
   */
  getOfflineStatus: protectedProcedure.query(async ({ ctx }) => {
    // 実際の実装では、ユーザーのオフライン状態を取得
    return {
      isOffline: false,
      lastSyncTimestamp: Date.now(),
    };
  }),
});

/**
 * 差分をレビュー
 */
async function reviewDiff(payload: DiffPayload): Promise<{
  canMerge: boolean;
  conflicts: string[];
  warnings: string[];
}> {
  const conflicts: string[] = [];
  const warnings: string[] = [];

  // 1. セマンティックユニットの重複チェック
  // 2. シードの整合性チェック
  // 3. イベントの時系列チェック

  // 例: 重複IDのチェック
  const unitIds = new Set(payload.localSemanticUnits.map((u) => u.id));
  if (unitIds.size !== payload.localSemanticUnits.length) {
    conflicts.push("Duplicate semantic unit IDs detected");
  }

  // 例: シードの参照整合性チェック
  for (const seed of payload.localSeeds) {
    for (const unitId of seed.semanticUnitIds) {
      if (!unitIds.has(unitId)) {
        warnings.push(`Seed ${seed.id} references non-existent unit ${unitId}`);
      }
    }
  }

  return {
    canMerge: conflicts.length === 0,
    conflicts,
    warnings,
  };
}

/**
 * 差分をマージ
 */
async function mergeDiff(userId: number, payload: DiffPayload): Promise<void> {
  // 1. セマンティックユニットを保存
  // 2. シードを保存
  // 3. イベントを記録

  // 実際の実装では、データベースに保存
  // const db = await getDb();
  // for (const unit of payload.localSemanticUnits) {
  //   await db.insert(semanticUnits).values(unit);
  // }
  // for (const seed of payload.localSeeds) {
  //   await db.insert(fractalSeeds).values(seed);
  // }
}

