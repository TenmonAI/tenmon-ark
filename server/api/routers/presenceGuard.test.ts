/**
 * Presence Guard Router Tests
 * 
 * Presence OS v1.0の閾値ガードレイヤーのテスト
 */

import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "../../routers";
import type { TrpcContext } from "../../_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
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
    res: {} as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
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
    res: {} as TrpcContext["res"],
  };
}

describe("presenceGuard.requestThresholdChange", () => {
  it("should create a threshold change request", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.presenceGuard.requestThresholdChange({
      thresholdPath: "naturalPresence.minConfidence",
      proposedValue: 0.7,
      reason: "Improve accuracy",
    });

    expect(result.success).toBe(true);
    expect(result.requestId).toBeGreaterThan(0);
  });

  it("should fail if proposed value is out of range", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.presenceGuard.requestThresholdChange({
        thresholdPath: "naturalPresence.minConfidence",
        proposedValue: 1.5,  // Out of range
        reason: "Invalid value",
      })
    ).rejects.toThrow();
  });
});

describe("presenceGuard.approveThresholdChange", () => {
  it("should allow admin to approve threshold change", async () => {
    const userCtx = createUserContext();
    const userCaller = appRouter.createCaller(userCtx);

    // Create a request first
    const createResult = await userCaller.presenceGuard.requestThresholdChange({
      engineType: "natural_presence",
      thresholdName: "minConfidence",
      currentValue: 0.6,
      proposedValue: 0.7,
      reason: "Improve accuracy",
    });

    const adminCtx = createAdminContext();
    const adminCaller = appRouter.createCaller(adminCtx);

    // Approve the request
    const result = await adminCaller.presenceGuard.approveThresholdChange({
      requestId: createResult.requestId,
    });

    expect(result.success).toBe(true);
  });

  it("should fail if non-admin tries to approve", async () => {
    const userCtx = createUserContext();
    const userCaller = appRouter.createCaller(userCtx);

    // Create a request first
    const createResult = await userCaller.presenceGuard.requestThresholdChange({
      engineType: "natural_presence",
      thresholdName: "minConfidence",
      currentValue: 0.6,
      proposedValue: 0.7,
      reason: "Improve accuracy",
    });

    // Try to approve with non-admin user
    await expect(
      userCaller.presenceGuard.approveThresholdChange({
        requestId: createResult.requestId,
      })
    ).rejects.toThrow("Only admin can approve threshold changes");
  });
});

describe("presenceGuard.rejectThresholdChange", () => {
  it("should allow admin to reject threshold change", async () => {
    const userCtx = createUserContext();
    const userCaller = appRouter.createCaller(userCtx);

    // Create a request first
    const createResult = await userCaller.presenceGuard.requestThresholdChange({
      engineType: "natural_presence",
      thresholdName: "minConfidence",
      currentValue: 0.6,
      proposedValue: 0.7,
      reason: "Improve accuracy",
    });

    const adminCtx = createAdminContext();
    const adminCaller = appRouter.createCaller(adminCtx);

    // Reject the request
    const result = await adminCaller.presenceGuard.rejectThresholdChange({
      requestId: createResult.requestId,
      reason: "Not necessary",
    });

    expect(result.success).toBe(true);
  });

  it("should fail if non-admin tries to reject", async () => {
    const userCtx = createUserContext();
    const userCaller = appRouter.createCaller(userCtx);

    // Create a request first
    const createResult = await userCaller.presenceGuard.requestThresholdChange({
      engineType: "natural_presence",
      thresholdName: "minConfidence",
      currentValue: 0.6,
      proposedValue: 0.7,
      reason: "Improve accuracy",
    });

    // Try to reject with non-admin user
    await expect(
      userCaller.presenceGuard.rejectThresholdChange({
        requestId: createResult.requestId,
        reason: "Not necessary",
      })
    ).rejects.toThrow("Only admin can reject threshold changes");
  });
});

describe("presenceGuard.getThresholdChangeHistory", () => {
  it("should return threshold change history", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.presenceGuard.getThresholdChangeHistory({
      limit: 10,
    });

    expect(Array.isArray(result.history)).toBe(true);
  });
});

describe("presenceGuard.getCurrentThresholds", () => {
  it("should return current thresholds", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.presenceGuard.getCurrentThresholds();

    expect(result.thresholds).toBeDefined();
    expect(typeof result.thresholds).toBe("object");
  });
});

describe("presenceGuard integration tests", () => {
  it("should complete full approval workflow", async () => {
    const userCtx = createUserContext();
    const userCaller = appRouter.createCaller(userCtx);

    const adminCtx = createAdminContext();
    const adminCaller = appRouter.createCaller(adminCtx);

    // 1. User requests threshold change
    const createResult = await userCaller.presenceGuard.requestThresholdChange({
      engineType: "natural_presence",
      thresholdName: "minConfidence",
      currentValue: 0.6,
      proposedValue: 0.7,
      reason: "Improve accuracy",
    });

    expect(createResult.success).toBe(true);

    // 2. Admin approves the change
    const approveResult = await adminCaller.presenceGuard.approveThresholdChange({
      requestId: createResult.requestId,
    });

    expect(approveResult.success).toBe(true);

    // 3. Check history
    const historyResult = await adminCaller.presenceGuard.getThresholdChangeHistory({
      limit: 1,
    });

    expect(historyResult.history.length).toBeGreaterThan(0);
    const latestRecord = historyResult.history[0];
    expect(latestRecord?.status).toBe("approved");
  });

  it("should complete full rejection workflow", async () => {
    const userCtx = createUserContext();
    const userCaller = appRouter.createCaller(userCtx);

    const adminCtx = createAdminContext();
    const adminCaller = appRouter.createCaller(adminCtx);

    // 1. User requests threshold change
    const createResult = await userCaller.presenceGuard.requestThresholdChange({
      thresholdPath: "hachiGen.FIRE_WATER_BALANCE_THRESHOLD",
      proposedValue: 15,
      reason: "Test rejection",
    });

    expect(createResult.success).toBe(true);

    // 2. Admin rejects the change
    const rejectResult = await adminCaller.presenceGuard.rejectThresholdChange({
      requestId: createResult.requestId,
      reason: "Not necessary",
    });

    expect(rejectResult.success).toBe(true);

    // 3. Check history
    const historyResult = await adminCaller.presenceGuard.getThresholdChangeHistory({
      limit: 1,
    });

    expect(historyResult.history.length).toBeGreaterThan(0);
    const latestRecord = historyResult.history[0];
    expect(latestRecord?.status).toBe("rejected");
  });
});
