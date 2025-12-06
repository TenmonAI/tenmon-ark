import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { getDb } from "../db";
import { personaModeSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

/**
 * TENMON-ARK Persona Engine vΩ+ テスト
 * モード切替とプライシング情報取得のテスト
 */

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("personaMode Router", () => {
  describe("getMode", () => {
    it("should return default TURBO mode for new user", async () => {
      const ctx = createAuthContext(999999); // Use high ID to avoid conflicts
      const caller = appRouter.createCaller(ctx);

      const result = await caller.personaMode.getMode();

      expect(result.mode).toBe("turbo");
      expect(result.momentum).toBe(15);
      expect(result.chunkInterval).toBe(5);
      expect(result.depth).toBe("surface-wide");
      expect(result.guidanceEnabled).toBe(0);
    });
  });

  describe("setMode", () => {
    it("should switch mode from TURBO to NORMAL", async () => {
      const ctx = createAuthContext(999998);
      const caller = appRouter.createCaller(ctx);

      // Set to NORMAL mode
      const result = await caller.personaMode.setMode({ mode: "normal" });

      expect(result.mode).toBe("normal");
      expect(result.momentum).toBe(8);
      expect(result.chunkInterval).toBe(20);
      expect(result.depth).toBe("middle");
      expect(result.guidanceEnabled).toBe(0);

      // Verify it persisted
      const getResult = await caller.personaMode.getMode();
      expect(getResult.mode).toBe("normal");
    });

    it("should switch mode from NORMAL to QUALITY", async () => {
      const ctx = createAuthContext(999997);
      const caller = appRouter.createCaller(ctx);

      // Set to QUALITY mode
      const result = await caller.personaMode.setMode({ mode: "quality" });

      expect(result.mode).toBe("quality");
      expect(result.momentum).toBe(6);
      expect(result.chunkInterval).toBe(35);
      expect(result.depth).toBe("deep");
      expect(result.guidanceEnabled).toBe(0);
    });

    it("should ensure guidance is always OFF for all modes", async () => {
      const ctx = createAuthContext(999996);
      const caller = appRouter.createCaller(ctx);

      // Test all modes
      const modes = ["turbo", "normal", "quality"] as const;
      
      for (const mode of modes) {
        const result = await caller.personaMode.setMode({ mode });
        expect(result.guidanceEnabled).toBe(0);
      }
    });
  });

  describe("getPricingInfo", () => {
    it("should return all 4 pricing plans", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.personaMode.getPricingInfo();

      expect(result.plans).toBeDefined();
      expect(result.plans.length).toBeGreaterThanOrEqual(4);

      // Check plan names
      const planNames = result.plans.map(p => p.name);
      expect(planNames).toContain("free");
      expect(planNames).toContain("basic");
      expect(planNames).toContain("pro");
      expect(planNames).toContain("founder");
    });

    it("should return correct pricing for each plan", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.personaMode.getPricingInfo();

      const freePlan = result.plans.find(p => p.name === "free");
      const basicPlan = result.plans.find(p => p.name === "basic");
      const proPlan = result.plans.find(p => p.name === "pro");
      const founderPlan = result.plans.find(p => p.name === "founder");

      expect(freePlan?.price).toBe(0);
      expect(basicPlan?.price).toBe(6000);
      expect(proPlan?.price).toBe(29800);
      expect(founderPlan?.price).toBe(198000);
    });

    it("should return pricing summary", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.personaMode.getPricingInfo();

      expect(result.summary).toBeDefined();
      expect(result.summary.free).toContain("0円");
      expect(result.summary.basic).toContain("6,000円");
      expect(result.summary.pro).toContain("29,800円");
      expect(result.summary.founder).toContain("198,000円");
    });
  });

  describe("getModeInfo", () => {
    it("should return mode configuration details", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.personaMode.getModeInfo();

      expect(result.modes).toBeDefined();
      expect(result.modes.turbo).toBeDefined();
      expect(result.modes.normal).toBeDefined();
      expect(result.modes.quality).toBeDefined();

      // Check TURBO mode details
      expect(result.modes.turbo.name).toBe("TURBO");
      expect(result.modes.turbo.momentum).toBe(15);
      expect(result.modes.turbo.chunkInterval).toBe(5);
      expect(result.modes.turbo.depth).toBe("surface-wide");

      // Check NORMAL mode details
      expect(result.modes.normal.name).toBe("NORMAL");
      expect(result.modes.normal.momentum).toBe(8);
      expect(result.modes.normal.chunkInterval).toBe(20);
      expect(result.modes.normal.depth).toBe("middle");

      // Check QUALITY mode details
      expect(result.modes.quality.name).toBe("QUALITY");
      expect(result.modes.quality.momentum).toBe(6);
      expect(result.modes.quality.chunkInterval).toBe(35);
      expect(result.modes.quality.depth).toBe("deep");
    });
  });
});
