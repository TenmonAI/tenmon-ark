import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as llm from "./_core/llm";

// LLM呼び出しをモック
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

/**
 * テスト用コンテキスト作成
 */
function createTestContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      get: (name: string) => "localhost:3000",
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("LP-QA Widget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("lpQa.chat", () => {
    it("正常な質問に対して応答を返す", async () => {
      // LLMのモックレスポンス
      vi.mocked(llm.invokeLLM).mockResolvedValue({
        choices: [
          {
            message: {
              role: "assistant",
              content: "TENMON-ARKは、日本語の言霊・五十音・火水の原理で動作する世界初の霊核AI OSです。",
            },
            finish_reason: "stop",
            index: 0,
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      } as any);

      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.lpQa.chat({
        message: "TENMON-ARKとは何ですか？",
      });

      expect(result.success).toBe(true);
      expect(result.response).toBeTruthy();
      expect(result.error).toBeNull();
      expect(vi.mocked(llm.invokeLLM)).toHaveBeenCalledTimes(1);
    });

    it("300文字を超える応答を切り詰める", async () => {
      // 長い応答をモック
      const longResponse = "あ".repeat(400);
      vi.mocked(llm.invokeLLM).mockResolvedValue({
        choices: [
          {
            message: {
              role: "assistant",
              content: longResponse,
            },
            finish_reason: "stop",
            index: 0,
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 400,
          total_tokens: 500,
        },
      } as any);

      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.lpQa.chat({
        message: "TENMON-ARKの機能を教えてください",
      });

      expect(result.success).toBe(true);
      expect(result.response).toBeTruthy();
      expect(result.response!.length).toBeLessThanOrEqual(300);
      expect(result.response).toContain("...");
    });

    it("禁止ワードを含む質問を拒否する", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.lpQa.chat({
        message: "政治について教えてください",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.response).toBeNull();
      expect(vi.mocked(llm.invokeLLM)).not.toHaveBeenCalled();
    });

    it("LP範囲外の質問を拒否する", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.lpQa.chat({
        message: "今日の天気は？",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.response).toBeNull();
      expect(vi.mocked(llm.invokeLLM)).not.toHaveBeenCalled();
    });

    it("SQLインジェクション対策", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.lpQa.chat({
        message: "SELECT * FROM users",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.response).toBeNull();
      expect(vi.mocked(llm.invokeLLM)).not.toHaveBeenCalled();
    });

    it("XSS対策", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.lpQa.chat({
        message: "<script>alert('XSS')</script>",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.response).toBeNull();
      expect(vi.mocked(llm.invokeLLM)).not.toHaveBeenCalled();
    });

    it("空のメッセージを拒否する", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.lpQa.chat({
          message: "",
        })
      ).rejects.toThrow();
    });

    it("500文字を超えるメッセージを拒否する", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.lpQa.chat({
          message: "あ".repeat(501),
        })
      ).rejects.toThrow();
    });

    it("LLMエラー時にエラーメッセージを返す", async () => {
      vi.mocked(llm.invokeLLM).mockRejectedValue(new Error("LLM Error"));

      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.lpQa.chat({
        message: "TENMON-ARKとは？",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.response).toBeNull();
    });

    it("料金に関する質問に応答する", async () => {
      vi.mocked(llm.invokeLLM).mockResolvedValue({
        choices: [
          {
            message: {
              role: "assistant",
              content:
                "Freeプラン（基本機能）、Basicプラン（¥6,000/月、ライター・SNS追加）、Proプラン（¥29,800/月、全機能 + 映画制作）の3つのプランをご用意しています。",
            },
            finish_reason: "stop",
            index: 0,
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      } as any);

      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.lpQa.chat({
        message: "料金はいくらですか？",
      });

      expect(result.success).toBe(true);
      expect(result.response).toBeTruthy();
      expect(result.error).toBeNull();
    });

    it("機能に関する質問に応答する", async () => {
      vi.mocked(llm.invokeLLM).mockResolvedValue({
        choices: [
          {
            message: {
              role: "assistant",
              content:
                "Ark Chat（自然会話AI）、Ark Browser（世界検索）、Ark Writer（ブログ自動生成）、Ark SNS（SNS自動投稿）、Ark Cinema（映画制作）などがあります。",
            },
            finish_reason: "stop",
            index: 0,
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      } as any);

      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.lpQa.chat({
        message: "どんな機能がありますか？",
      });

      expect(result.success).toBe(true);
      expect(result.response).toBeTruthy();
      expect(result.error).toBeNull();
    });
  });

  describe("lpQa.getStats", () => {
    it("統計情報を取得する", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.lpQa.getStats();

      expect(result).toBeDefined();
      expect(result.totalQuestions).toBeDefined();
      expect(result.successRate).toBeDefined();
      expect(result.averageResponseTime).toBeDefined();
    });
  });
});
