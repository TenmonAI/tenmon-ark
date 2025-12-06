import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { plans, subscriptions, billingHistory } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import Stripe from "stripe";
import { ENV } from "../_core/env";

// Initialize Stripe
const stripe = new Stripe(ENV.stripeSecretKey, {
  apiVersion: "2025-11-17.clover",
});

/**
 * Plan Management Router vΩ
 * TENMON-ARK Economic Core System
 */
export const planManagementRouter = router({
  /**
   * 1️⃣ getCurrentPlan - Get user's current plan with feature flags
   */
  getCurrentPlan: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    // Get user's active subscription
    const userSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, ctx.user.id),
          eq(subscriptions.status, "active")
        )
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    const subscription = userSubscriptions[0];

    // Default to Free plan if no subscription
    if (!subscription) {
      const freePlans = await db
        .select()
        .from(plans)
        .where(eq(plans.name, "free"))
        .limit(1);

      const freePlan = freePlans[0];
      if (!freePlan) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Free plan not found",
        });
      }

      return {
        plan: freePlan,
        subscription: null,
        usage: {
          fileUploads: 0,
          fileStorageBytes: 0,
          conversations: 0,
          memoryItems: 0,
        },
      };
    }

    // Get plan details
    const userPlans = await db
      .select()
      .from(plans)
      .where(eq(plans.id, subscription.planId))
      .limit(1);

    const plan = userPlans[0];
    if (!plan) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Plan not found",
      });
    }

    return {
      plan,
      subscription,
      usage: {
        fileUploads: subscription.currentFileUploads,
        fileStorageBytes: Number(subscription.currentFileStorageBytes),
        conversations: subscription.currentConversations,
        memoryItems: subscription.currentMemoryItems,
      },
    };
  }),

  /**
   * 2️⃣ listPlans - Get all available plans
   */
  listPlans: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    const allPlans = await db
      .select()
      .from(plans)
      .where(eq(plans.isActive, 1))
      .orderBy(plans.sortOrder);

    return allPlans;
  }),

  /**
   * 3️⃣ subscribe - Create Stripe Checkout Session for new subscription
   */
  subscribe: protectedProcedure
    .input(
      z.object({
        planId: z.number().int().positive(),
        successUrl: z.string().url().optional(),
        cancelUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Get plan details
      const selectedPlans = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.planId))
        .limit(1);

      const plan = selectedPlans[0];
      if (!plan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Plan not found",
        });
      }

      // Check if plan is Free
      if (plan.name === "free") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot subscribe to Free plan",
        });
      }

      // Check if user already has an active subscription
      const existingSubscriptions = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, ctx.user.id),
            eq(subscriptions.status, "active")
          )
        )
        .limit(1);

      if (existingSubscriptions.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User already has an active subscription. Use upgradePlan instead.",
        });
      }

      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: plan.billingCycle === "lifetime" ? "payment" : "subscription",
        line_items: [
          {
            price: plan.stripePriceId || undefined,
            quantity: 1,
          },
        ],
        customer_email: ctx.user.email || undefined,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          userId: ctx.user.id.toString(),
          planId: plan.id.toString(),
          planName: plan.name,
        },
        success_url:
          input.successUrl ||
          `${ENV.viteOauthPortalUrl}/plans?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: input.cancelUrl || `${ENV.viteOauthPortalUrl}/plans`,
      });

      // Create pending subscription record (no startDate field)
      await db.insert(subscriptions).values({
        userId: ctx.user.id,
        planId: plan.id,
        planName: plan.name,
        status: "trialing", // Will be updated by webhook
        currentPeriodStart: new Date(),
        currentPeriodEnd:
          plan.billingCycle === "lifetime"
            ? null
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });

      return {
        sessionId: session.id,
        sessionUrl: session.url,
      };
    }),

  /**
   * 4️⃣ upgradePlan - Upgrade to a higher plan
   */
  upgradePlan: protectedProcedure
    .input(
      z.object({
        newPlanId: z.number().int().positive(),
        successUrl: z.string().url().optional(),
        cancelUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Get current subscription
      const currentSubscriptions = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, ctx.user.id),
            eq(subscriptions.status, "active")
          )
        )
        .limit(1);

      const currentSubscription = currentSubscriptions[0];
      if (!currentSubscription) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No active subscription found. Use subscribe instead.",
        });
      }

      // Get new plan details
      const newPlans = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.newPlanId))
        .limit(1);

      const newPlan = newPlans[0];
      if (!newPlan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "New plan not found",
        });
      }

      // Get current plan details
      const currentPlans = await db
        .select()
        .from(plans)
        .where(eq(plans.id, currentSubscription.planId))
        .limit(1);

      const currentPlan = currentPlans[0];
      if (!currentPlan) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Current plan not found",
        });
      }

      // Check if upgrade is valid (price should be higher)
      if (newPlan.price <= currentPlan.price) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "New plan must be higher tier than current plan",
        });
      }

      // Create Stripe Checkout Session for upgrade
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: newPlan.billingCycle === "lifetime" ? "payment" : "subscription",
        line_items: [
          {
            price: newPlan.stripePriceId || undefined,
            quantity: 1,
          },
        ],
        customer_email: ctx.user.email || undefined,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          userId: ctx.user.id.toString(),
          planId: newPlan.id.toString(),
          planName: newPlan.name,
          isUpgrade: "true",
          previousSubscriptionId: currentSubscription.id.toString(),
        },
        success_url:
          input.successUrl ||
          `${ENV.viteOauthPortalUrl}/plans?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: input.cancelUrl || `${ENV.viteOauthPortalUrl}/plans`,
      });

      return {
        sessionId: session.id,
        sessionUrl: session.url,
        priceDifference: newPlan.price - currentPlan.price,
      };
    }),

  /**
   * 5️⃣ cancelSubscription - Cancel current subscription
   */
  cancelSubscription: protectedProcedure
    .input(
      z.object({
        immediately: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Get current subscription
      const currentSubscriptions = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, ctx.user.id),
            eq(subscriptions.status, "active")
          )
        )
        .limit(1);

      const subscription = currentSubscriptions[0];
      if (!subscription) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No active subscription found",
        });
      }

      // Cancel Stripe subscription if exists
      if (subscription.stripeSubscriptionId) {
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: !input.immediately,
        });

        if (input.immediately) {
          await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
        }
      }

      // Update subscription status
      await db
        .update(subscriptions)
        .set({
          status: input.immediately ? "canceled" : "active",
          cancelAtPeriodEnd: input.immediately ? 0 : 1,
          canceledAt: new Date(),
        })
        .where(eq(subscriptions.id, subscription.id));

      return {
        success: true,
        message: input.immediately
          ? "Subscription canceled immediately"
          : "Subscription will be canceled at period end",
      };
    }),

  /**
   * 6️⃣ getBillingHistory - Get user's billing history
   */
  getBillingHistory: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    const history = await db
      .select()
      .from(billingHistory)
      .where(eq(billingHistory.userId, ctx.user.id))
      .orderBy(desc(billingHistory.createdAt));

    return history;
  }),

  /**
   * 🔸 Helper: Check if user can use a feature
   */
  canUseFeature: protectedProcedure
    .input(
      z.object({
        feature: z.enum([
          "fileUpload",
          "memorySave",
          "knowledgeEngine",
          "ulce",
          "arkBrowser",
          "mt5Trading",
          "founderFeatures",
        ]),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return false;
      }

      // Get user's current plan
      const userSubscriptions = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, ctx.user.id),
            eq(subscriptions.status, "active")
          )
        )
        .limit(1);

      const subscription = userSubscriptions[0];

      // Default to Free plan
      let planId = 1; // Assume Free plan has ID 1
      if (subscription) {
        planId = subscription.planId;
      }

      const userPlans = await db
        .select()
        .from(plans)
        .where(eq(plans.id, planId))
        .limit(1);

      const plan = userPlans[0];
      if (!plan) {
        return false;
      }

      // Check feature flag
      const featureMap = {
        fileUpload: plan.canUseFileUpload,
        memorySave: plan.canUseMemorySave,
        knowledgeEngine: plan.canUseKnowledgeEngine,
        ulce: plan.canUseULCE,
        arkBrowser: plan.canUseArkBrowser,
        mt5Trading: plan.canUseMT5Trading,
        founderFeatures: plan.canUseFounderFeatures,
      };

      return featureMap[input.feature] === 1;
    }),

  /**
   * 🔸 Helper: Get TENMON-ARK persona settings for current plan
   */
  getPersonaSettings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    // Get user's current plan
    const userSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, ctx.user.id),
          eq(subscriptions.status, "active")
        )
      )
      .limit(1);

    const subscription = userSubscriptions[0];

    // Default to Free plan
    let planId = 1; // Assume Free plan has ID 1
    if (subscription) {
      planId = subscription.planId;
    }

    const userPlans = await db
      .select()
      .from(plans)
      .where(eq(plans.id, planId))
      .limit(1);

    const plan = userPlans[0];
    if (!plan) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Plan not found",
      });
    }

    return {
      planName: plan.name,
      responseSpeedMultiplier: plan.responseSpeedMultiplier,
      thinkingDepthLevel: plan.thinkingDepthLevel,
      twinCoreAnalysisDepth: plan.twinCoreAnalysisDepth,
    };
  }),
});
