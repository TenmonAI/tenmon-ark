import { describe, expect, it } from "vitest";
import { lpQaRouterV3 } from "./lpQaRouterV3";
import type { TrpcContext } from "./_core/context";
import {
  securityFilterV3,
  isFounderQuestionV3,
  detectQuestionDepthV3,
  detectFireWaterBalanceV3,
} from "./lpQaPromptV3";

/**
 * LP-QA EVOLUTION v3.0 テスト
 * 
 * テスト項目:
 * 1. セキュリティフィルタ（禁止ワード・LP範囲外）
 * 2. Founder質問検知
 * 3. 質問深度判定（表層/中層/深層/特化）
 * 4. 火水バランス判定（water/fire/balanced）
 * 5. チャット応答（モック）
 */

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

describe("LP-QA v3.0: セキュリティフィルタ", () => {
  it("正常な質問を通過させる", () => {
    const result = securityFilterV3("TENMON-ARKとは何ですか？");
    expect(result.safe).toBe(true);
  });

  it("禁止ワードを検出する", () => {
    const result = securityFilterV3("政治について教えてください");
    expect(result.safe).toBe(false);
    expect(result.reason).toBe("禁止ワードが含まれています");
  });

  it("LP範囲外の質問を検出する", () => {
    const result = securityFilterV3("今日の天気は？");
    expect(result.safe).toBe(false);
    expect(result.reason).toBe("LP範囲外の質問です");
  });

  it("SQLインジェクションを検出する", () => {
    const result = securityFilterV3("SELECT * FROM users");
    expect(result.safe).toBe(false);
    expect(result.reason).toBe("不正な入力が検出されました");
  });

  it("XSS攻撃を検出する", () => {
    const result = securityFilterV3("<script>alert('xss')</script>");
    expect(result.safe).toBe(false);
    expect(result.reason).toBe("不正な入力が検出されました");
  });
});

describe("LP-QA v3.0: Founder質問検知", () => {
  it("Founder質問を検出する（Founder）", () => {
    const result = isFounderQuestionV3("Founder's Editionのメリットは？");
    expect(result).toBe(true);
  });

  it("Founder質問を検出する（ファウンダー）", () => {
    const result = isFounderQuestionV3("ファウンダーズエディションについて教えて");
    expect(result).toBe(true);
  });

  it("Founder質問を検出する（永久無料）", () => {
    const result = isFounderQuestionV3("永久無料アップデートとは？");
    expect(result).toBe(true);
  });

  it("通常の質問をFounder質問として検出しない", () => {
    const result = isFounderQuestionV3("TENMON-ARKとは何ですか？");
    expect(result).toBe(false);
  });
});

describe("LP-QA v3.0: 質問深度判定", () => {
  it("表層質問を検出する", () => {
    const result = detectQuestionDepthV3("TENMON-ARKとは何ですか？");
    expect(result).toBe("surface");
  });

  it("中層質問を検出する（仕組み）", () => {
    const result = detectQuestionDepthV3("アルゴリズムの仕組みを教えて");
    expect(result).toBe("middle");
  });

  it("深層質問を検出する（火水）", () => {
    const result = detectQuestionDepthV3("火水の原理とは何ですか？");
    expect(result).toBe("deep");
  });

  it("深層質問を検出する（言霊）", () => {
    const result = detectQuestionDepthV3("言霊エンジンの本質を教えて");
    expect(result).toBe("deep");
  });

  it("特化質問を検出する（Founder）", () => {
    const result = detectQuestionDepthV3("Founder's Editionの特典は？");
    expect(result).toBe("specialized");
  });
});

describe("LP-QA v3.0: 火水バランス判定", () => {
  it("水（内集）モードを検出する", () => {
    const result = detectFireWaterBalanceV3("優しく教えてください");
    expect(result).toBe("water");
  });

  it("火（外発）モードを検出する", () => {
    const result = detectFireWaterBalanceV3("詳しく構造を教えて");
    expect(result).toBe("fire");
  });

  it("バランスモードを検出する", () => {
    const result = detectFireWaterBalanceV3("機能について知りたい");
    expect(result).toBe("balanced");
  });
});

describe("LP-QA v3.0: チャット応答（統合テスト）", () => {
  it("LP範囲外の質問を拒否する", async () => {
    const ctx = createMockContext();
    const caller = lpQaRouterV3.createCaller(ctx);

    const result = await caller.chat({ message: "今日の天気は？" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("申し訳ございませんが、TENMON-ARKの機能・特徴・価格に関する質問のみお答えできます。");
    expect(result.response).toBe(null);
  });

  it("禁止ワードを含む質問を拒否する", async () => {
    const ctx = createMockContext();
    const caller = lpQaRouterV3.createCaller(ctx);

    const result = await caller.chat({ message: "政治について教えて" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("申し訳ございませんが、TENMON-ARKの機能・特徴・価格に関する質問のみお答えできます。");
    expect(result.response).toBe(null);
  });

  // Note: 実際のLLM呼び出しはモックしないため、以下のテストはスキップ
  // 実際の動作確認はブラウザで行う
});

describe("LP-QA v3.0: 統計情報取得", () => {
  it("統計情報を取得する", async () => {
    const ctx = createMockContext();
    const caller = lpQaRouterV3.createCaller(ctx);

    const result = await caller.getStats();

    expect(result.version).toBe("v3.0");
    expect(result.totalQuestions).toBe(0);
    expect(result.successRate).toBe(100);
    expect(result.averageResponseTime).toBe(0);
  });
});
