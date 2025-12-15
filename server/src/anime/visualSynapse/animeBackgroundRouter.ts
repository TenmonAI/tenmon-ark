/**
 * Anime Background Router
 * アニメ背景生成API
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../../../_core/trpc';
import { generateBackground } from './visualSynapseEngine';
import { getDb } from '../../../db';
import { subscriptions, plans } from '../../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

const generateBackgroundSchema = z.object({
  style: z.enum(['ghibli', 'mappa', 'shinkai', 'kyoto', 'trigger', 'wit']),
  type: z.enum(['nature', 'urban', 'interior', 'fantasy', 'sci-fi', 'abstract']),
  description: z.string().optional(),
  mood: z.enum(['serene', 'energetic', 'melancholic', 'mysterious', 'peaceful', 'dramatic']).optional(),
  timeOfDay: z.enum(['dawn', 'morning', 'noon', 'afternoon', 'sunset', 'night', 'midnight']).optional(),
  weather: z.enum(['clear', 'cloudy', 'rainy', 'snowy', 'foggy', 'stormy']).optional(),
  colorPalette: z.enum(['warm', 'cool', 'vibrant', 'muted', 'monochrome', 'pastel']).optional(),
  size: z.enum(['1024x1024', '1792x1024', '1024x1792']).optional(),
  quality: z.enum(['standard', 'hd']).optional(),
  saveToKokuzo: z.boolean().optional(),
});

export const animeBackgroundRouter = router({
  /**
   * 背景画像を生成
   */
  generate: protectedProcedure
    .input(generateBackgroundSchema)
    .mutation(async ({ ctx, input }) => {
      // プランチェック（Proプラン以上）
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      // ユーザーの現在のプランを取得
      const userSubscriptions = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, ctx.user.id),
            eq(subscriptions.status, 'active')
          )
        )
        .limit(1);

      const subscription = userSubscriptions[0];

      // プランIDを取得（デフォルトはFreeプラン = 1）
      let planId = 1;
      if (subscription) {
        planId = subscription.planId;
      }

      // プラン詳細を取得
      const userPlans = await db
        .select()
        .from(plans)
        .where(eq(plans.id, planId))
        .limit(1);

      const plan = userPlans[0];
      if (!plan) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Plan not found',
        });
      }

      // Proプラン以上で利用可能（plan.nameが'pro'または'promax'または'founder'）
      const allowedPlans = ['pro', 'promax', 'founder'];
      if (!allowedPlans.includes(plan.name.toLowerCase())) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This feature requires Pro plan or higher',
        });
      }

      try {
        const result = await generateBackground({
          ...input,
          saveToKokuzo: input.saveToKokuzo ?? true,
        });

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Background generation failed',
        });
      }
    }),
});

