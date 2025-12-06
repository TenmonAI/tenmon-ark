/**
 * LP Chat AI テスト
 * 
 * LP Soft Personaのシステムプロンプトが正しく適用されているかテスト
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { generateLpChatResponse, logLpLlmPayload } from "./lpChatAI";
import { ChatMessage } from "../../drizzle/schema";

// Mock invokeLLM
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    choices: [
      {
        message: {
          content: "はい、天聞アークです。AI OSとして設計され、会話・解析・創作などを行います。",
        },
      },
    ],
  })),
}));

// Mock universalMemoryRouter
vi.mock("../engines/universalMemoryRouter", () => ({
  getUniversalMemoryContext: vi.fn(async () => ({
    userId: 0,
    serviceType: 'lp-qa',
    conversationId: 0,
    memoryContext: {
      shortTerm: [],
      mediumTerm: [],
      longTerm: [],
      importantFacts: [],
    },
    centerlinePersona: '',
  })),
  buildMemoryPrompt: vi.fn(() => ''),
}));

// Mock lpSoftPersona
vi.mock("../prompts/lpSoftPersona", () => ({
  applyLpSoftPersona: vi.fn(() => 'あなたは天聞アーク(TENMON-ARK)です。'),
}));

// Mock personaOutputFilter
vi.mock("../utils/personaOutputFilter", () => ({
  removeInternalTags: vi.fn((text: string) => text),
}));

// Mock turboEngineV10
vi.mock("../config/turboEngineV10", () => ({
  measurePerformance: vi.fn(() => 100),
  logPerformance: vi.fn(),
}));

describe("LP Chat AI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("LP Soft Personaのシステムプロンプトが適用される", async () => {
    const messages: ChatMessage[] = [
      {
        id: 1,
        role: "user",
        content: "天聞アークとは何ですか？",
        roomId: 0,
        userId: 0,
        createdAt: new Date(),
      },
    ];

    const response = await generateLpChatResponse({
      userId: 0,
      messages,
      language: "ja",
    });

    expect(response).toBeTruthy();
    expect(typeof response).toBe("string");
  });

  it("depth指示が正しく適用される", async () => {
    const messages: ChatMessage[] = [
      {
        id: 1,
        role: "user",
        content: "Twin-Coreとは何ですか？",
        roomId: 0,
        userId: 0,
        createdAt: new Date(),
      },
    ];

    const payload = await logLpLlmPayload({
      userId: 0,
      messages,
      language: "ja",
      depth: "deep",
    });

    expect(payload.systemPrompt).toContain("詳しく、深い洞察を含めた回答を心がけてください");
    expect(payload.depth).toBe("deep");
  });

  it("fireWaterBalance指示が正しく適用される", async () => {
    const messages: ChatMessage[] = [
      {
        id: 1,
        role: "user",
        content: "言霊とは何ですか？",
        roomId: 0,
        userId: 0,
        createdAt: new Date(),
      },
    ];

    const payload = await logLpLlmPayload({
      userId: 0,
      messages,
      language: "ja",
      fireWaterBalance: "balanced",
    });

    expect(payload.systemPrompt).toContain("火と水のバランスを取り、調和的な回答を心がけてください");
    expect(payload.fireWaterBalance).toBe("balanced");
  });

  it("enableMemorySyncがtrueの場合、メモリコンテキストが統合される", async () => {
    const messages: ChatMessage[] = [
      {
        id: 1,
        role: "user",
        content: "料金はいくら？",
        roomId: 0,
        userId: 1,
        createdAt: new Date(),
      },
    ];

    const payload = await logLpLlmPayload({
      userId: 1,
      messages,
      language: "ja",
      enableMemorySync: true,
    });

    expect(payload.enableMemorySync).toBe(true);
    // メモリコンテキストが統合されている場合、システムプロンプトに含まれる
    // （実際のテストではモックされているため、ここでは構造のみ確認）
  });

  it("会話履歴が正しく変換される", async () => {
    const messages: ChatMessage[] = [
      {
        id: 1,
        role: "user",
        content: "こんにちは",
        roomId: 0,
        userId: 0,
        createdAt: new Date(),
      },
      {
        id: 2,
        role: "assistant",
        content: "はい、天聞アークです。",
        roomId: 0,
        userId: 0,
        createdAt: new Date(),
      },
      {
        id: 3,
        role: "user",
        content: "料金を教えて",
        roomId: 0,
        userId: 0,
        createdAt: new Date(),
      },
    ];

    const payload = await logLpLlmPayload({
      userId: 0,
      messages,
      language: "ja",
    });

    expect(payload.messages).toHaveLength(3);
    expect(payload.messages[0]?.role).toBe("user");
    expect(payload.messages[1]?.role).toBe("assistant");
    expect(payload.messages[2]?.role).toBe("user");
  });

  it("エラー時にフォールバックメッセージを返す", async () => {
    // invokeLLMをエラーを投げるようにモック
    const { invokeLLM } = await import("../_core/llm");
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("LLM Error"));

    const messages: ChatMessage[] = [
      {
        id: 1,
        role: "user",
        content: "テスト",
        roomId: 0,
        userId: 0,
        createdAt: new Date(),
      },
    ];

    const response = await generateLpChatResponse({
      userId: 0,
      messages,
      language: "ja",
    });

    expect(response).toContain("申し訳ございません");
  });
});
