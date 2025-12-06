import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { convertToKyuji } from "./kotodama/kyujiFilter";

/**
 * TENMON-ARK 言灵エンジン テスト vΩ-K
 * 
 * 言霊秘書準拠システムの動作を検証
 */

// テスト用のコンテキストを作成
function createTestContext(): TrpcContext {
  return {
    user: undefined,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("言灵エンジン - 旧字体変換", () => {
  it("基本的な旧字体変換が正しく動作する", () => {
    expect(convertToKyuji("霊")).toBe("靈");
    expect(convertToKyuji("気")).toBe("氣");
    expect(convertToKyuji("言霊")).toBe("言灵");
    expect(convertToKyuji("学")).toBe("學");
    expect(convertToKyuji("国")).toBe("國");
  });

  it("複数の文字を含むテキストが正しく変換される", () => {
    const input = "霊性と気力を学ぶ";
    const expected = "靈性と氣力を學ぶ";
    expect(convertToKyuji(input)).toBe(expected);
  });

  it("言霊は特殊変換される (霊→灵)", () => {
    expect(convertToKyuji("言霊")).toBe("言灵");
    expect(convertToKyuji("言霊秘書")).toBe("言灵秘書");
  });

  it("変換対象でない文字はそのまま保持される", () => {
    const input = "こんにちは世界";
    expect(convertToKyuji(input)).toBe(input);
  });

  it("空文字列やnullを適切に処理する", () => {
    expect(convertToKyuji("")).toBe("");
    expect(convertToKyuji(null as any)).toBe(null);
    expect(convertToKyuji(undefined as any)).toBe(undefined);
  });
});

describe("言灵エンジン - API テスト", () => {
  it("旧字体変換APIが正しく動作する", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.kotodama.convertToKyuji({
      text: "霊性と気力",
    });

    expect(result.original).toBe("霊性と気力");
    expect(result.converted).toBe("靈性と氣力");
    expect(result.mapping).toHaveLength(2);
    expect(result.mapping[0]).toEqual({ shinji: "霊", kyuji: "靈" });
    expect(result.mapping[1]).toEqual({ shinji: "気", kyuji: "氣" });
  });

  it("五十音全件取得APIが動作する", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // データベースが利用可能な場合のみテスト
    try {
      const result = await caller.kotodama.getAllGojuon();
      expect(Array.isArray(result)).toBe(true);
      // データが登録されていない場合は空配列
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("kana");
        expect(result[0]).toHaveProperty("romaji");
        expect(result[0]).toHaveProperty("suikaType");
      }
    } catch (error: any) {
      // データベースが利用できない場合はスキップ
      if (error.message.includes("Database not available")) {
        console.warn("Database not available, skipping test");
      } else {
        throw error;
      }
    }
  });

  it("水火解析APIが正しく動作する", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.kotodama.analyzeSuika({
        text: "あいうえお",
      });

      expect(result).toHaveProperty("analysis");
      expect(result).toHaveProperty("balance");
      expect(result).toHaveProperty("dominantType");
      expect(result.analysis).toHaveProperty("total");
      expect(result.analysis).toHaveProperty("水");
      expect(result.analysis).toHaveProperty("火");
      expect(result.analysis).toHaveProperty("details");
    } catch (error: any) {
      // データベースが利用できない場合はスキップ
      if (error.message.includes("Database not available")) {
        console.warn("Database not available, skipping test");
      } else {
        throw error;
      }
    }
  });

  it("言霊解釈検索APIが動作する", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.kotodama.searchInterpretation({
        word: "言霊",
      });

      expect(Array.isArray(result)).toBe(true);
      // データが登録されている場合の検証
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("word");
        expect(result[0]).toHaveProperty("interpretation");
      }
    } catch (error: any) {
      // データベースが利用できない場合はスキップ
      if (error.message.includes("Database not available")) {
        console.warn("Database not available, skipping test");
      } else {
        throw error;
      }
    }
  });
});

describe("言灵エンジン - 統合テスト", () => {
  it("言霊秘書準拠システムの基本フローが動作する", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // 1. テキストを旧字体に変換
    const kyujiResult = await caller.kotodama.convertToKyuji({
      text: "霊性の学び",
    });
    expect(kyujiResult.converted).toBe("靈性の學び");

    // 2. 五十音データを取得 (データベースが利用可能な場合)
    try {
      const gojuonResult = await caller.kotodama.getAllGojuon();
      expect(Array.isArray(gojuonResult)).toBe(true);
    } catch (error: any) {
      if (!error.message.includes("Database not available")) {
        throw error;
      }
    }

    // 3. 水火解析を実行 (データベースが利用可能な場合)
    try {
      const suikaResult = await caller.kotodama.analyzeSuika({
        text: "あいうえお",
      });
      expect(suikaResult).toHaveProperty("balance");
    } catch (error: any) {
      if (!error.message.includes("Database not available")) {
        throw error;
      }
    }
  });
});
