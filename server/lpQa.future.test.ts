import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { 
  isFounderQuestion, 
  detectQuestionDepth, 
  detectFireWaterBalance,
  containsForbiddenWords,
  isOutOfScope,
  securityFilter,
} from "./lpQaPrompt";

/**
 * LP-QA Future UI Upgrade v1.0 統合テスト
 * - B層: 返答人格の最適化
 * - Sentence Depth（表層/中層/深層）
 * - FIRE-WATER Personality Mode（水=受容・優しい、火=明晰・構造）
 * - Founder質問への特化回答
 */

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("LP-QA Future UI Upgrade v1.0", () => {
  describe("B層: Founder質問検知", () => {
    it("Founder's Editionキーワードを検知", () => {
      expect(isFounderQuestion("Founder's Editionのメリットは？")).toBe(true);
      expect(isFounderQuestion("ファウンダーズエディションについて教えて")).toBe(true);
      expect(isFounderQuestion("永久無料アップデートとは？")).toBe(true);
      expect(isFounderQuestion("¥198,000の価値は？")).toBe(true);
      expect(isFounderQuestion("Founder専用コミュニティとは？")).toBe(true);
    });

    it("非Founder質問は検知しない", () => {
      expect(isFounderQuestion("TENMON-ARKとは何ですか？")).toBe(false);
      expect(isFounderQuestion("チャット機能について教えて")).toBe(false);
      expect(isFounderQuestion("価格プランは？")).toBe(false);
    });
  });

  describe("B層: 質問深度判定", () => {
    it("深層質問を検知", () => {
      expect(detectQuestionDepth("Twin-Core構文とは何ですか？")).toBe("deep");
      expect(detectQuestionDepth("火水のバランスについて教えて")).toBe("deep");
      expect(detectQuestionDepth("言霊エンジンの原理は？")).toBe("deep");
      expect(detectQuestionDepth("霊核OSの本質を知りたい")).toBe("deep");
    });

    it("中層質問を検知", () => {
      expect(detectQuestionDepth("TENMON-ARKの仕組みは？")).toBe("middle");
      expect(detectQuestionDepth("具体的な機能を教えて")).toBe("middle");
      expect(detectQuestionDepth("技術的な詳細を知りたい")).toBe("middle");
    });

    it("表層質問を検知", () => {
      expect(detectQuestionDepth("TENMON-ARKとは何ですか？")).toBe("surface");
      expect(detectQuestionDepth("料金はいくらですか？")).toBe("surface");
      expect(detectQuestionDepth("どんな機能がありますか？")).toBe("surface");
    });
  });

  describe("B層: 火水バランス判定", () => {
    it("火（外発）モードを検知", () => {
      expect(detectFireWaterBalance("どうやって動作するのですか？")).toBe("fire");
      expect(detectFireWaterBalance("なぜ霊核OSなのですか？")).toBe("fire");
      expect(detectFireWaterBalance("詳しく教えてください")).toBe("fire");
    });

    it("水（内集）モードを検知", () => {
      expect(detectFireWaterBalance("優しく説明してください")).toBe("water");
      expect(detectFireWaterBalance("安心して使えますか？")).toBe("water");
      expect(detectFireWaterBalance("簡単に使えますか？")).toBe("water");
    });

    it("中庸モードを検知", () => {
      expect(detectFireWaterBalance("TENMON-ARKとは何ですか？")).toBe("balanced");
      expect(detectFireWaterBalance("料金はいくらですか？")).toBe("balanced");
    });
  });

  describe("セキュリティフィルタ", () => {
    it("禁止ワードを検知", () => {
      expect(containsForbiddenWords("政治について教えて")).toBe(true);
      expect(containsForbiddenWords("宗教的な意味は？")).toBe(true);
      expect(containsForbiddenWords("差別的な表現")).toBe(true);
    });

    it("LP範囲外を検知", () => {
      expect(isOutOfScope("今日の天気は？")).toBe(true);
      expect(isOutOfScope("株価を教えて")).toBe(true);
      expect(isOutOfScope("料理のレシピを教えて")).toBe(true);
    });

    it("安全な質問を許可", () => {
      const result = securityFilter("TENMON-ARKとは何ですか？");
      expect(result.safe).toBe(true);
    });

    it("不正な入力を拒否", () => {
      const sqlInjection = securityFilter("SELECT * FROM users");
      expect(sqlInjection.safe).toBe(false);

      const xss = securityFilter("<script>alert('xss')</script>");
      expect(xss.safe).toBe(false);
    });
  });

  describe("LP-QA Chat API", () => {
    it("正常な質問に応答", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.lpQa.chat({
        message: "TENMON-ARKとは何ですか？",
      });

      expect(result.success).toBe(true);
      expect(result.error).toBe(null);
      expect(result.response).toBeTruthy();
      expect(result.response!.length).toBeGreaterThan(0);
      expect(result.response!.length).toBeLessThanOrEqual(600);
    });

    it("LP範囲外の質問を拒否", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.lpQa.chat({
        message: "今日の天気は？",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.response).toBe(null);
    });

    it("禁止ワードを含む質問を拒否", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.lpQa.chat({
        message: "政治について教えて",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.response).toBe(null);
    });

    it("Founder質問に特化回答", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.lpQa.chat({
        message: "Founder's Editionのメリットは？",
      });

      expect(result.success).toBe(true);
      expect(result.error).toBe(null);
      expect(result.response).toBeTruthy();
      // Founder関連キーワードが含まれているか確認
      const response = result.response!.toLowerCase();
      expect(
        response.includes("founder") ||
        response.includes("永久無料") ||
        response.includes("特典") ||
        response.includes("コミュニティ")
      ).toBe(true);
    });
  });

  describe("LP-QA Stats API", () => {
    it("統計情報を取得", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.lpQa.getStats();

      expect(result).toHaveProperty("totalQuestions");
      expect(result).toHaveProperty("successRate");
      expect(result).toHaveProperty("averageResponseTime");
      expect(typeof result.totalQuestions).toBe("number");
      expect(typeof result.successRate).toBe("number");
      expect(typeof result.averageResponseTime).toBe("number");
    });
  });
});
