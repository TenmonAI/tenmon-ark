import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(plan: "free" | "basic" | "pro" | "founder" | "dev" = "pro"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    plan: plan,
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
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("customArk router", () => {
  it("should allow Pro users to create Custom ARK", async () => {
    const { ctx } = createAuthContext("pro");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.customArk.create({
      name: "Test ARK",
      description: "Test description",
      systemPrompt: "You are a test assistant.",
    });

    expect(result).toEqual({ success: true });
  });

  it("should allow Founder users to create Custom ARK", async () => {
    const { ctx } = createAuthContext("founder");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.customArk.create({
      name: "Founder ARK",
      description: "Founder test",
      systemPrompt: "You are a founder assistant.",
    });

    expect(result).toEqual({ success: true });
  });

  it("should reject Free users from creating Custom ARK", async () => {
    const { ctx } = createAuthContext("free");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.customArk.create({
        name: "Test ARK",
        systemPrompt: "Test prompt",
      })
    ).rejects.toThrow("Custom ARK is only available for Pro, Founder, and Dev plans");
  });

  it("should list user's Custom ARKs", async () => {
    const { ctx } = createAuthContext("pro");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.customArk.list();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("founderFeedback router", () => {
  it("should allow Founder users to create feedback", async () => {
    const { ctx } = createAuthContext("founder");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.founderFeedback.create({
      category: "feature_request",
      title: "Test Feature",
      message: "This is a test feature request.",
      priority: 3,
    });

    expect(result).toEqual({ success: true });
  });

  it("should reject Pro users from creating feedback", async () => {
    const { ctx } = createAuthContext("pro");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.founderFeedback.create({
        category: "bug_report",
        title: "Test Bug",
        message: "This is a test bug report.",
      })
    ).rejects.toThrow("Founder Feedback is only available for Founder and Dev plans");
  });

  it("should list user's feedback", async () => {
    const { ctx } = createAuthContext("founder");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.founderFeedback.list();

    expect(Array.isArray(result)).toBe(true);
  });
});
