/**
 * Ark Browser Test Suite
 * 世界検索、Deep Parse、翻訳機能のテスト
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

describe("Ark Browser - fetchPage", () => {
  it("should fetch page content from URL", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.arkBrowser.fetchPage({
      url: "https://example.com",
    });

    expect(result).toHaveProperty("content");
    expect(result.content).toBeTruthy();
    expect(typeof result.content).toBe("string");
  });
});

describe("Ark Browser - deepParse", () => {
  it("should extract important paragraphs from content", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const testContent = `
      これはテスト用の文章です。第一段落です。
      
      これは第二段落です。重要な情報が含まれています。
      
      これは第三段落です。さらに詳細な説明があります。
      
      これは第四段落です。結論を述べています。
    `;

    const result = await caller.arkBrowser.deepParse({
      content: testContent,
      maxParagraphs: 3,
    });

    expect(result).toHaveProperty("paragraphs");
    expect(result).toHaveProperty("keyPoints");
    expect(result).toHaveProperty("summary");
    expect(Array.isArray(result.paragraphs)).toBe(true);
    expect(result.paragraphs.length).toBeLessThanOrEqual(3);
    
    // 各段落に必要なプロパティがあることを確認
    result.paragraphs.forEach((para) => {
      expect(para).toHaveProperty("text");
      expect(para).toHaveProperty("importance");
      expect(para.importance).toBeGreaterThanOrEqual(0);
      expect(para.importance).toBeLessThanOrEqual(1);
    });
  });
});

describe("Ark Browser - translateIntent", () => {
  it("should translate search intent to target language", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.arkBrowser.translateIntent({
      query: "AIの最新動向",
      targetLanguage: "en",
    });

    expect(result).toHaveProperty("translatedIntent");
    expect(result.translatedIntent).toBeTruthy();
    expect(typeof result.translatedIntent).toBe("string");
  });
});

describe("Ark Browser - summarizePage", () => {
  it("should summarize page content", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const testContent = `
      人工知能（AI）は、コンピュータサイエンスの一分野であり、
      人間の知的な振る舞いを模倣するシステムの研究開発を行います。
      機械学習、深層学習、自然言語処理などの技術が含まれます。
      近年、AIは様々な産業で活用されており、
      医療、金融、製造業などで大きな成果を上げています。
    `;

    const result = await caller.arkBrowser.summarizePage({
      content: testContent,
      maxLength: 100,
    });

    expect(result).toHaveProperty("summary");
    expect(result.summary).toBeTruthy();
    expect(typeof result.summary).toBe("string");
    expect(result.summary.length).toBeLessThanOrEqual(150); // マージン考慮
  });
});

describe("Ark Browser - detectDangerousSite", () => {
  it("should detect dangerous sites", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.arkBrowser.detectDangerousSite({
      url: "https://example.com",
      content: "This is a safe website content.",
    });

    expect(result).toHaveProperty("dangerLevel");
    expect(result).toHaveProperty("dangerType");
    expect(result).toHaveProperty("description");
    expect(["safe", "low", "medium", "high", "critical"]).toContain(result.dangerLevel);
    expect(Array.isArray(result.dangerType)).toBe(true);
  });
});

describe("Ark Browser - convertPageToSpiritual", () => {
  it("should convert page content to spiritual text", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const testContent = "これはテスト用の文章です。";

    const result = await caller.arkBrowser.convertPageToSpiritual({
      content: testContent,
    });

    expect(result).toHaveProperty("spiritualText");
    expect(result.spiritualText).toBeTruthy();
    expect(typeof result.spiritualText).toBe("string");
  });
});
