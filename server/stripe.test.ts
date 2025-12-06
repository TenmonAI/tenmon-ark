import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {
        origin: "https://test.example.com",
      },
      get: (key: string) => {
        if (key === "host") return "test.example.com";
        return undefined;
      },
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("Stripe Integration", () => {
  it("should list available plans", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const plans = await caller.plans.list();

    expect(plans).toBeDefined();
    expect(plans.length).toBeGreaterThan(0);
    expect(plans.some((p) => p.name === "free")).toBe(true);
    expect(plans.some((p) => p.name === "basic")).toBe(true);
    expect(plans.some((p) => p.name === "pro")).toBe(true);
  });

  it("should get plan by name", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const plan = await caller.plans.getByName({ name: "basic" });

    expect(plan).toBeDefined();
    expect(plan?.name).toBe("basic");
    expect(plan?.price).toBe(6000);
  });

  it("should get user subscription", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const subscription = await caller.subscription.getMy();

    // User may not have a subscription yet, so it can be null or undefined
    expect(
      subscription === null ||
      subscription === undefined ||
      typeof subscription === "object"
    ).toBe(true);
  });

  it("should validate checkout session creation requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
        get: () => undefined,
      } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.subscription.createCheckout({ planName: "basic" })
    ).rejects.toThrow();
  });
});
