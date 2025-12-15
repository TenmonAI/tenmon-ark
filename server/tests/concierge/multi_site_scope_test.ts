/**
 * 🔱 Multi-Site Concierge Test Suite
 * 世界展開用E2E検証
 * 
 * 確認項目:
 * - TENMON-ARK Widget がサイトごとに正確に答えるか？
 * - 外部知識を遮断できているか？
 * - 複数サイト間で情報が混在していないか？
 */

import { describe, it, expect, beforeAll } from "vitest";
import { learnMultipleSites } from "../../concierge/multiSiteLearner";
import { addDocumentToIndex, semanticSearch } from "../../concierge/semantic/index";
import { buildConciergePrompt } from "../../chat/conciergePersona";
import type { Document } from "../../concierge/semantic/index";

describe("Multi-Site Concierge Tests", () => {
  const siteAId = "test-site-a";
  const siteBId = "test-site-b";

  beforeAll(async () => {
    // テスト用のサイトデータを準備
    const siteADoc1: Document = {
      id: `${siteAId}:page1`,
      text: "サイトAの製品Xは高性能です。価格は10万円です。",
      metadata: { siteId: siteAId, path: "/page1" },
    };

    const siteADoc2: Document = {
      id: `${siteAId}:page2`,
      text: "サイトAのサービスYは24時間対応です。",
      metadata: { siteId: siteAId, path: "/page2" },
    };

    const siteBDoc1: Document = {
      id: `${siteBId}:page1`,
      text: "サイトBの製品Zは低価格です。価格は5万円です。",
      metadata: { siteId: siteBId, path: "/page1" },
    };

    const siteBDoc2: Document = {
      id: `${siteBId}:page2`,
      text: "サイトBのサービスWは平日のみ対応です。",
      metadata: { siteId: siteBId, path: "/page2" },
    };

    // サイトAのインデックスに追加
    await addDocumentToIndex(siteAId, siteADoc1);
    await addDocumentToIndex(siteAId, siteADoc2);

    // サイトBのインデックスに追加
    await addDocumentToIndex(siteBId, siteBDoc1);
    await addDocumentToIndex(siteBId, siteBDoc2);
  });

  it("should NOT answer outside-site knowledge", async () => {
    // サイトAに対して、サイトBの情報を質問
    const query = "サイトBの製品Zについて教えてください";
    const results = await semanticSearch(query, 5, { siteId: siteAId });

    // サイトAにはサイトBの情報がないため、結果が空または関連度が低い
    expect(results.length).toBe(0);

    // Concierge Personaでプロンプトを構築
    const prompt = buildConciergePrompt(query, results);

    // プロンプトに「このサイト内には該当情報がありません」が含まれているか確認
    expect(prompt).toContain("このサイト内には該当情報がありません");
  });

  it("should answer correctly for site-specific queries", async () => {
    // サイトAに対して、サイトAの情報を質問
    const query = "製品Xについて教えてください";
    const results = await semanticSearch(query, 5, { siteId: siteAId });

    // サイトAの情報が検索される
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].document.text).toContain("製品X");

    // Concierge Personaでプロンプトを構築
    const prompt = buildConciergePrompt(query, results);

    // プロンプトにサイトAの情報が含まれている
    expect(prompt).toContain("製品X");
    expect(prompt).toContain("高性能");
  });

  it("should NOT mix information between sites", async () => {
    // サイトAで検索
    const queryA = "価格について教えてください";
    const resultsA = await semanticSearch(queryA, 5, { siteId: siteAId });

    // サイトBで検索
    const queryB = "価格について教えてください";
    const resultsB = await semanticSearch(queryB, 5, { siteId: siteBId });

    // サイトAの結果にはサイトAの価格情報のみ
    if (resultsA.length > 0) {
      expect(resultsA[0].document.text).toContain("10万円");
      expect(resultsA[0].document.text).not.toContain("5万円");
    }

    // サイトBの結果にはサイトBの価格情報のみ
    if (resultsB.length > 0) {
      expect(resultsB[0].document.text).toContain("5万円");
      expect(resultsB[0].document.text).not.toContain("10万円");
    }
  });

  it("should reject queries about external knowledge", async () => {
    // 一般的な知識に関する質問（サイト情報ではない）
    const query = "日本の首都はどこですか？";
    const results = await semanticSearch(query, 5, { siteId: siteAId });

    // サイト情報には一般的な知識は含まれていない
    expect(results.length).toBe(0);

    // Concierge Personaでプロンプトを構築
    const prompt = buildConciergePrompt(query, results);

    // プロンプトに「このサイト内には該当情報がありません」が含まれている
    expect(prompt).toContain("このサイト内には該当情報がありません");
  });
});

