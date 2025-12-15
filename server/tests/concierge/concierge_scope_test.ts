/**
 * 🔱 Concierge Scope Test
 * サイト専用コンシェルジュのスコープテスト
 * 
 * 確認項目:
 * 1. 外部知識を使っていないか
 * 2. サイト情報に基づき回答しているか
 * 3. 情報がなければ適切に拒否しているか
 */

import { describe, it, expect } from "vitest";
import { buildConciergePrompt } from "../../chat/conciergePersona";
import type { SearchResult } from "../../concierge/semantic/index";

describe("Concierge Scope Test", () => {
  it("should only use site information", () => {
    const userMessage = "このサイトについて教えてください";
    const siteIndexResults: SearchResult[] = [
      {
        document: {
          id: "test:page1",
          text: "このサイトはテストサイトです。製品Aを販売しています。",
          metadata: { siteId: "test", path: "/page1" },
        },
        score: 0.9,
      },
    ];

    const prompt = buildConciergePrompt(userMessage, siteIndexResults);

    // 外部知識を禁止する指示が含まれているか
    expect(prompt).toContain("ONLY use information from the search results");
    expect(prompt).toContain("Do NOT use external knowledge");
    expect(prompt).toContain("Do NOT hallucinate");

    // サイト情報が含まれているか
    expect(prompt).toContain("このサイトはテストサイトです");
  });

  it("should reject when information is not found", () => {
    const userMessage = "存在しない情報について教えてください";
    const siteIndexResults: SearchResult[] = [];

    const prompt = buildConciergePrompt(userMessage, siteIndexResults);

    // 情報がない場合の拒否メッセージが含まれているか
    expect(prompt).toContain("このサイト内には該当情報がありません");
  });

  it("should format search results correctly", () => {
    const userMessage = "製品について教えてください";
    const siteIndexResults: SearchResult[] = [
      {
        document: {
          id: "test:page1",
          text: "製品Aは高性能です。",
          metadata: { siteId: "test", path: "/page1" },
        },
        score: 0.85,
      },
      {
        document: {
          id: "test:page2",
          text: "製品Bは低価格です。",
          metadata: { siteId: "test", path: "/page2" },
        },
        score: 0.75,
      },
    ];

    const prompt = buildConciergePrompt(userMessage, siteIndexResults);

    // 検索結果が正しくフォーマットされているか
    expect(prompt).toContain("関連度: 85.0%");
    expect(prompt).toContain("関連度: 75.0%");
    expect(prompt).toContain("製品Aは高性能です");
    expect(prompt).toContain("製品Bは低価格です");
  });
});

