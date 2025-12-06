import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("planManagement", () => {
  it("getCurrentPlan returns user's current plan", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.planManagement.getCurrentPlan();

    expect(result).toBeDefined();
    expect(result.plan).toBeDefined();
    expect(result.plan.name).toBeDefined();
    expect(["free", "basic", "pro", "founder"]).toContain(result.plan.name);
  });

  it("listPlans returns all available plans", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.planManagement.listPlans();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    
    // Check that all plans have required fields
    result.forEach((plan) => {
      expect(plan.name).toBeDefined();
      expect(plan.displayName).toBeDefined();
      expect(plan.price).toBeDefined();
      expect(["free", "basic", "pro", "founder"]).toContain(plan.name);
    });
  });
});
