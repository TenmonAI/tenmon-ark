/**
 * Ark Writer Test Suite
 * 記事自動生成、SEO最適化、投稿機能のテスト
 */

import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// テスト用のコンテキストを作成
function createTestContext(): TrpcContext {
  const user = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as any,
    res: {} as any,
  };
}

describe("Ark Writer - generatePost", () => {
  it("should generate blog post with all required fields", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.arkWriter.generatePost({
      topic: "AIの未来",
      style: "balanced",
      targetLanguage: "ja",
      seoOptimize: true,
      wordCount: 500,
    });

    // 必須フィールドの確認
    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("excerpt");
    expect(result).toHaveProperty("tags");
    expect(result).toHaveProperty("seoKeywords");
    expect(result).toHaveProperty("metaDescription");
    expect(result).toHaveProperty("slug");
    expect(result).toHaveProperty("estimatedReadTime");
    expect(result).toHaveProperty("fireWaterBalance");

    // タイトルと内容の確認
    expect(result.title).toBeTruthy();
    expect(result.content).toBeTruthy();
    expect(result.content.length).toBeGreaterThan(0);

    // タグとキーワードの確認
    expect(Array.isArray(result.tags)).toBe(true);
    expect(Array.isArray(result.seoKeywords)).toBe(true);

    // 火水バランスの確認
    expect(result.fireWaterBalance).toHaveProperty("fire");
    expect(result.fireWaterBalance).toHaveProperty("water");
    expect(result.fireWaterBalance.fire).toBeGreaterThanOrEqual(0);
    expect(result.fireWaterBalance.fire).toBeLessThanOrEqual(1);
    expect(result.fireWaterBalance.water).toBeGreaterThanOrEqual(0);
    expect(result.fireWaterBalance.water).toBeLessThanOrEqual(1);
  });

  it("should generate fire-style post", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.arkWriter.generatePost({
      topic: "革新的なテクノロジー",
      style: "fire",
      targetLanguage: "ja",
      seoOptimize: true,
      wordCount: 500,
    });

    expect(result.fireWaterBalance.fire).toBeGreaterThan(0.5);
  });

  it("should generate water-style post", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.arkWriter.generatePost({
      topic: "心の平穏",
      style: "water",
      targetLanguage: "ja",
      seoOptimize: true,
      wordCount: 500,
    });

    expect(result.fireWaterBalance.water).toBeGreaterThan(0.5);
  });
});

describe("Ark Writer - autoPublish", () => {
  it("should publish post to WordPress", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const testPost = {
      title: "テスト記事",
      content: "これはテスト用の記事です。",
      excerpt: "テスト記事の抜粋",
      tags: ["test", "ai"],
      seoKeywords: ["test", "keyword"],
      metaDescription: "テスト記事のメタ説明",
      slug: "test-article",
      estimatedReadTime: 5,
      fireWaterBalance: {
        fire: 0.5,
        water: 0.5,
      },
    };

    const result = await caller.arkWriter.autoPublish({
      post: testPost,
      platform: "wordpress",
    });

    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("url");
    expect(result.success).toBe(true);
    expect(result.url).toBeTruthy();
  });

  it("should publish post to Medium", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const testPost = {
      title: "テスト記事",
      content: "これはテスト用の記事です。",
      excerpt: "テスト記事の抜粋",
      tags: ["test", "ai"],
      seoKeywords: ["test", "keyword"],
      metaDescription: "テスト記事のメタ説明",
      slug: "test-article",
      estimatedReadTime: 5,
      fireWaterBalance: {
        fire: 0.5,
        water: 0.5,
      },
    };

    const result = await caller.arkWriter.autoPublish({
      post: testPost,
      platform: "medium",
    });

    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("url");
    expect(result.success).toBe(true);
  });

  it("should publish post to Dev.to", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const testPost = {
      title: "テスト記事",
      content: "これはテスト用の記事です。",
      excerpt: "テスト記事の抜粋",
      tags: ["test", "ai"],
      seoKeywords: ["test", "keyword"],
      metaDescription: "テスト記事のメタ説明",
      slug: "test-article",
      estimatedReadTime: 5,
      fireWaterBalance: {
        fire: 0.5,
        water: 0.5,
      },
    };

    const result = await caller.arkWriter.autoPublish({
      post: testPost,
      platform: "dev.to",
    });

    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("url");
    expect(result.success).toBe(true);
  });
});
