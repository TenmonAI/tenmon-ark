import { Request, Response } from "express";
import Stripe from "stripe";
import * as db from "./db";
import { getProductByPriceId } from "../shared/products";
import { stripe } from "./stripe";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * Stripe Webhook Handler
 * 
 * Handles subscription lifecycle events:
 * - checkout.session.completed: Create subscription record
 * - customer.subscription.created: Activate subscription
 * - customer.subscription.updated: Update subscription status
 * - customer.subscription.deleted: Downgrade to free
 * - invoice.payment_failed: Handle payment failures
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    console.error("[Webhook] Missing stripe-signature header");
    return res.status(400).send("Missing signature");
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error("[Webhook] Signature verification failed:", err);
    return res.status(400).send(`Webhook Error: ${err}`);
  }

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, returning verification response");
    return res.json({
      verified: true,
    });
  }

  console.log(`[Webhook] Received event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error(`[Webhook] Error processing ${event.type}:`, error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log("[Webhook] Processing checkout.session.completed");

  const userId = session.metadata?.user_id;
  if (!userId) {
    console.error("[Webhook] Missing user_id in session metadata");
    return;
  }

  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  if (!subscriptionId) {
    console.error("[Webhook] Missing subscription ID");
    return;
  }

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id;
  const currentPeriodStart = (subscription as any).current_period_start;
  const currentPeriodEnd = (subscription as any).current_period_end;

  if (!priceId) {
    console.error("[Webhook] Missing price ID");
    return;
  }

  // Find product by price ID
  const product = getProductByPriceId(priceId);
  if (!product) {
    console.error(`[Webhook] Unknown price ID: ${priceId}`);
    return;
  }

  // Get plan ID from database
  const plan = await db.getPlanByName(product.name as "free" | "basic" | "pro" | "founder");
  if (!plan) {
    console.error(`[Webhook] Plan not found: ${product.name}`);
    return;
  }

  // Create or update subscription in database
  const existingSub = await db.getUserSubscription(parseInt(userId));

  if (existingSub) {
    await db.updateSubscription(parseInt(userId), {
      planId: plan.id,
      planName: product.name as "free" | "basic" | "pro",
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      status: "active",
      currentPeriodStart: new Date(currentPeriodStart * 1000),
      currentPeriodEnd: new Date(currentPeriodEnd * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end ? 1 : 0,
    });
  } else {
    await db.createSubscription({
      userId: parseInt(userId),
      planId: plan.id,
      planName: product.name as "free" | "basic" | "pro",
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      status: "active",
      currentPeriodStart: new Date(currentPeriodStart * 1000),
      currentPeriodEnd: new Date(currentPeriodEnd * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end ? 1 : 0,
    });
  }

  console.log(`[Webhook] Subscription created/updated for user ${userId}: ${product.name}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log("[Webhook] Processing subscription updated");

  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;

  if (!priceId) {
    console.error("[Webhook] Missing price ID");
    return;
  }

  const product = getProductByPriceId(priceId);
  if (!product) {
    console.error(`[Webhook] Unknown price ID: ${priceId}`);
    return;
  }

  // Find user by customer ID
  const existingSub = await db.getSubscriptionByStripeId(subscription.id);
  if (!existingSub) {
    console.error(`[Webhook] Subscription not found: ${subscription.id}`);
    return;
  }

  const currentPeriodStart = (subscription as any).current_period_start;
  const currentPeriodEnd = (subscription as any).current_period_end;

  await db.updateSubscription(existingSub.userId, {
    planName: product.name as "free" | "basic" | "pro",
    status: subscription.status as "active" | "canceled" | "past_due" | "trialing",
    currentPeriodStart: new Date(currentPeriodStart * 1000),
    currentPeriodEnd: new Date(currentPeriodEnd * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end ? 1 : 0,
  });

  console.log(`[Webhook] Subscription updated for user ${existingSub.userId}: ${product.name}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("[Webhook] Processing subscription deleted");

  const existingSub = await db.getSubscriptionByStripeId(subscription.id);
  if (!existingSub) {
    console.error(`[Webhook] Subscription not found: ${subscription.id}`);
    return;
  }

  // Downgrade to free plan
  await db.updateSubscription(existingSub.userId, {
    planName: "free",
    status: "canceled",
    cancelAtPeriodEnd: 0,
  });

  console.log(`[Webhook] Subscription deleted, downgraded user ${existingSub.userId} to free`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log("[Webhook] Processing payment failed");

  const subscriptionId = (invoice as any).subscription as string;
  if (!subscriptionId) {
    console.error("[Webhook] Missing subscription ID in invoice");
    return;
  }

  const existingSub = await db.getSubscriptionByStripeId(subscriptionId);
  if (!existingSub) {
    console.error(`[Webhook] Subscription not found: ${subscriptionId}`);
    return;
  }

  // Mark subscription as past_due
  await db.updateSubscription(existingSub.userId, {
    status: "past_due",
  });

  console.log(`[Webhook] Payment failed for user ${existingSub.userId}, marked as past_due`);
}
