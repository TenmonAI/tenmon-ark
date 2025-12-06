import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { personaModeSettings, plans } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Persona Mode Router
 * 
 * TENMON-ARK Persona Engine vΩ+ のモード切替機能を提供
 * TURBO / NORMAL / QUALITY の3モードを管理
 */

// モード定義
export const MODE_CONFIGS = {
  turbo: {
    momentum: 15,
    chunkInterval: 5,
    depth: "surface-wide" as const,
    guidanceEnabled: 0,
  },
  normal: {
    momentum: 8,
    chunkInterval: 20,
    depth: "middle" as const,
    guidanceEnabled: 0,
  },
  quality: {
    momentum: 6,
    chunkInterval: 35,
    depth: "deep" as const,
    guidanceEnabled: 0,
  },
} as const;

export const personaModeRouter = router({
  /**
   * ユーザーのモード設定を取得
   */
  getMode: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const settings = await db
        .select()
        .from(personaModeSettings)
        .where(eq(personaModeSettings.userId, ctx.user.id))
        .limit(1);

      if (settings.length === 0) {
        // デフォルト設定を作成
        const [newSettings] = await db.insert(personaModeSettings).values({
          userId: ctx.user.id,
          mode: "turbo",
          momentum: MODE_CONFIGS.turbo.momentum,
          chunkInterval: MODE_CONFIGS.turbo.chunkInterval,
          depth: MODE_CONFIGS.turbo.depth,
          guidanceEnabled: MODE_CONFIGS.turbo.guidanceEnabled,
        });

        return {
          mode: "turbo" as const,
          ...MODE_CONFIGS.turbo,
        };
      }

      return settings[0];
    }),

  /**
   * モードを切り替え
   */
  setMode: protectedProcedure
    .input(z.object({
      mode: z.enum(["turbo", "normal", "quality"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const config = MODE_CONFIGS[input.mode];

      // 既存の設定を更新、なければ作成
      const existing = await db
        .select()
        .from(personaModeSettings)
        .where(eq(personaModeSettings.userId, ctx.user.id))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(personaModeSettings).values({
          userId: ctx.user.id,
          mode: input.mode,
          momentum: config.momentum,
          chunkInterval: config.chunkInterval,
          depth: config.depth,
          guidanceEnabled: config.guidanceEnabled,
        });
      } else {
        await db
          .update(personaModeSettings)
          .set({
            mode: input.mode,
            momentum: config.momentum,
            chunkInterval: config.chunkInterval,
            depth: config.depth,
            guidanceEnabled: config.guidanceEnabled,
            updatedAt: new Date(),
          })
          .where(eq(personaModeSettings.userId, ctx.user.id));
      }

      return {
        mode: input.mode,
        ...config,
      };
    }),

  /**
   * 料金プラン情報を取得（Persona Memory 常駐データ）
   */
  getPricingInfo: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const allPlans = await db
        .select()
        .from(plans)
        .where(eq(plans.isActive, 1))
        .orderBy(plans.sortOrder);

      return {
        plans: allPlans.map(plan => ({
          name: plan.name,
          displayName: plan.displayName,
          description: plan.description,
          price: plan.price,
          billingCycle: plan.billingCycle,
          features: plan.features ? JSON.parse(plan.features) : [],
        })),
        summary: {
          free: "0円 - 基本チャット、1日30メッセージ",
          basic: "6,000円／月 - 言霊・宿曜の完全解析、自動化タスク、Memory 50件",
          pro: "29,800円／月 - AI国家OSフル機能、自動WEB構築、SNS自動発信、Memory無制限",
          founder: "198,000円（永久）- Pro の全機能が永久無料、専用コミュニティ、α版先行利用、人格進化に参加する権利",
        },
      };
    }),

  /**
   * モード設定の詳細情報を取得
   */
  getModeInfo: publicProcedure
    .query(() => {
      return {
        modes: {
          turbo: {
            name: "TURBO",
            description: "応答初速 0.2秒未満、first-token latency 80ms未満",
            ...MODE_CONFIGS.turbo,
          },
          normal: {
            name: "NORMAL",
            description: "バランスの取れた応答速度と品質",
            ...MODE_CONFIGS.normal,
          },
          quality: {
            name: "QUALITY",
            description: "深い思考と高品質な応答",
            ...MODE_CONFIGS.quality,
          },
        },
      };
    }),
});
