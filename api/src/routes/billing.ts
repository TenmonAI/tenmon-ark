/**
 * TENMON_PWA_BILLING_LINK_RUNTIME_FIX_CURSOR_AUTO_V6
 * マウント: app.use("/api/billing", billingRouter) を index.ts で cookie 直後（汎用 /api より先）
 * — GET /api/billing/link（生存確認）, POST /api/billing/link, POST /api/billing/checkout, GET /api/billing/session/verify
 */
import { Router } from "express";
import { getDb } from "../db/index.js";

function cookieOpts() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 400,
  };
}

function authSessionFromRequest(req: { cookies?: Record<string, string>; headers?: { cookie?: string } }): string {
  const fromParser = String(req.cookies?.auth_session ?? "").trim();
  if (fromParser) return fromParser;
  const raw = req.headers?.cookie;
  if (!raw) return "";
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    if (name === "auth_session") {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return part.slice(idx + 1).trim();
      }
    }
  }
  return "";
}

function getUserIdFromAuthCookie(req: { cookies?: Record<string, string>; headers?: { cookie?: string } }): string | null {
  const sessionId = authSessionFromRequest(req);
  if (!sessionId) return null;
  try {
    const db = getDb("kokuzo");
    const sess = db
      .prepare(`SELECT userId, expiresAt FROM auth_sessions WHERE sessionId = ? LIMIT 1`)
      .get(sessionId) as { userId?: string; expiresAt?: string } | undefined;
    if (!sess?.userId) return null;
    if (sess.expiresAt && String(sess.expiresAt) < new Date().toISOString()) return null;
    return String(sess.userId);
  } catch {
    return null;
  }
}

function getUserEmail(userId: string): string | null {
  try {
    const db = getDb("kokuzo");
    const row = db.prepare(`SELECT email FROM auth_users WHERE userId = ? LIMIT 1`).get(userId) as
      | { email?: string }
      | undefined;
    return row?.email ? String(row.email) : null;
  } catch {
    return null;
  }
}

function appOrigin(req: { protocol?: string; get?: (h: string) => string | undefined }): string {
  const env = String(process.env.PUBLIC_APP_ORIGIN ?? process.env.SITE_ORIGIN ?? "").trim().replace(/\/$/, "");
  if (env) return env;
  const host = req.get?.("host") || "localhost:3000";
  const proto = req.protocol || "http";
  return `${proto}://${host}`;
}

async function stripeGet(path: string, secretKey: string): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(String(data?.error?.message || res.statusText || "stripe_error"));
  }
  return data;
}

async function stripePostForm(
  path: string,
  secretKey: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(String(data?.error?.message || res.statusText || "stripe_error"));
  }
  return data;
}

function isPaidStripeSession(sess: Record<string, unknown>): boolean {
  const ps = String(sess.payment_status ?? "");
  return ps === "paid" || ps === "no_payment_required";
}

const router = Router();

router.options("/link", (_req, res) => {
  res.setHeader("Allow", "POST, OPTIONS");
  return res.status(204).end();
});

router.get("/link", (_req, res) => {
  res.setHeader("Allow", "POST, OPTIONS");
  /** GET はルート生存確認用（curl / ロードバランサ）。課金処理は POST のみ。 */
  return res.status(200).json({
    ok: true,
    endpoint: "billing_link",
    method: "POST",
    contentType: "application/json",
    bodyShape: { sessionId: "stripe_checkout_session_id" },
    auth: "auth_session_cookie_required",
    unauthenticatedPost: { http: 401, shape: { ok: false, error: "UNAUTHORIZED" } },
  });
});

router.post("/link", async (req, res) => {
  try {
    const userId = getUserIdFromAuthCookie(req as { cookies?: Record<string, string> });
    if (!userId) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const sessionId = String((req.body as { sessionId?: string })?.sessionId ?? "").trim();
    if (!sessionId) return res.status(400).json({ ok: false, error: "BAD_REQUEST", detail: "sessionId required" });

    const sk = String(process.env.STRIPE_SECRET_KEY ?? "").trim();
    if (!sk) return res.status(200).json({ ok: true, linked: false, reason: "stripe_not_configured" });

    const sess = await stripeGet(`/checkout/sessions/${encodeURIComponent(sessionId)}`, sk);
    if (!isPaidStripeSession(sess)) {
      return res.status(403).json({ ok: false, error: "PAYMENT_INCOMPLETE" });
    }

    const details = sess.customer_details as { email?: string } | undefined;
    const customerEmail = String(details?.email ?? sess.customer_email ?? "").trim();
    const userEmail = getUserEmail(userId);
    if (customerEmail && userEmail && customerEmail.toLowerCase() !== userEmail.toLowerCase()) {
      return res.status(403).json({ ok: false, error: "EMAIL_MISMATCH" });
    }

    res.cookie("tenmon_founder", "1", cookieOpts());
    return res.json({ ok: true, linked: true, founder: true });
  } catch (e: unknown) {
    const msg = String((e as Error)?.message || e || "");
    if (/No such checkout\.session/i.test(msg) || /resource_missing/i.test(msg)) {
      return res.status(403).json({ ok: false, error: "INVALID_SESSION" });
    }
    return res.status(502).json({ ok: false, error: "STRIPE_ERROR", detail: msg });
  }
});

router.options("/checkout", (_req, res) => {
  res.setHeader("Allow", "POST, OPTIONS");
  return res.status(204).end();
});

router.post("/checkout", async (req, res) => {
  try {
    const userId = getUserIdFromAuthCookie(req as { cookies?: Record<string, string> });
    if (!userId) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const sk = String(process.env.STRIPE_SECRET_KEY ?? "").trim();
    const priceId = String(process.env.STRIPE_PRICE_ID_FOUNDER ?? process.env.STRIPE_PRICE_ID ?? "").trim();
    if (!sk || !priceId) {
      return res.status(200).json({ ok: false, error: "CHECKOUT_UNAVAILABLE" });
    }

    const origin = appOrigin(req);
    const successUrl = `${origin}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/pricing?canceled=1`;

    const params: Record<string, string> = {
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: successUrl,
      cancel_url: cancelUrl,
    };
    const em = getUserEmail(userId);
    if (em) params.customer_email = em;

    const session = await stripePostForm("/checkout/sessions", sk, params);
    const url = String(session.url ?? "");
    if (!url) return res.status(502).json({ ok: false, error: "NO_CHECKOUT_URL" });
    return res.json({ ok: true, url });
  } catch (e: unknown) {
    return res.status(502).json({ ok: false, error: "STRIPE_ERROR", detail: String((e as Error)?.message || e) });
  }
});

router.get("/session/verify", async (req, res) => {
  try {
    const sessionId = String(req.query.session_id ?? "").trim();
    if (!sessionId) return res.status(400).json({ ok: false, error: "BAD_REQUEST" });

    const sk = String(process.env.STRIPE_SECRET_KEY ?? "").trim();
    if (!sk) return res.status(200).json({ ok: false, founder: false, reason: "stripe_not_configured" });

    const sess = await stripeGet(`/checkout/sessions/${encodeURIComponent(sessionId)}`, sk);
    if (!isPaidStripeSession(sess)) {
      return res.status(200).json({ ok: false, founder: false });
    }

    res.cookie("tenmon_founder", "1", cookieOpts());
    return res.json({ ok: true, founder: true });
  } catch (e: unknown) {
    const msg = String((e as Error)?.message || e || "");
    if (/No such checkout\.session/i.test(msg) || /resource_missing/i.test(msg)) {
      return res.status(403).json({ ok: false, founder: false, error: "INVALID_SESSION" });
    }
    return res.status(502).json({ ok: false, founder: false, error: "STRIPE_ERROR", detail: msg });
  }
});

export default router;
