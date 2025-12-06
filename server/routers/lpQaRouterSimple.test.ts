import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

// LLM呼び出しをモック
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: "TENMON-ARKは高度なAI会話エンジンです。",
        },
      },
    ],
  }),
}));

// DB呼び出しをモック
vi.mock("../db", () => ({
  getAllSiteInfo: vi.fn().mockResolvedValue([
    { key: "release_status", value: "開発中" },
    { key: "founder_release_date", value: "2025-02-28" },
    { key: "official_release_date", value: "2026-03-21" },
    { key: "free_plan_available", value: "false" },
  ]),
}));

function createMockContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("lpQaSimple.chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("質問に対して回答を返す", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.lpQaSimple.chat({
      question: "TENMON-ARKとは何ですか？",
    });

    expect(result).toHaveProperty("answer");
    expect(typeof result.answer).toBe("string");
    expect(result.answer.length).toBeGreaterThan(0);
  });

  it("空の質問を拒否する", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.lpQaSimple.chat({
        question: "",
      })
    ).rejects.toThrow();
  });

  it("LLMエラー時にエラーメッセージを返す", async () => {
    // LLMエラーをシミュレート
    const { invokeLLM } = await import("../_core/llm");
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("LLM API Error"));

    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.lpQaSimple.chat({
        question: "テスト質問",
      })
    ).rejects.toThrow("回答の生成に失敗しました");
  });
});
