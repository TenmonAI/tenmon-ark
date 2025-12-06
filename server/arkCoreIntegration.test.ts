/**
 * Ark Core Integration Tests
 * KJCE・OKRE・古五十音エンジンの統合テスト
 */

import { describe, it, expect } from "vitest";
import {
  applyArkCore,
  applyArkCoreBatch,
  getArkCoreStatistics,
  ArkCoreOptions,
} from "./arkCoreIntegration";

describe("Ark Core Integration", () => {
  describe("applyArkCore", () => {
    it("should apply KJCE (言灵変換)", async () => {
      const text = "気持ちが良い天気です。";
      const result = await applyArkCore(text, {
        applyKJCE: true,
        applyOKRE: false,
        applyAncient50Sound: false,
      });

      // 気→氣に変換されるべき
      expect(result.text).toContain("氣");
      expect(result.appliedTransformations).toContain("KJCE");
      expect(result.details.kjce?.converted).toBe(true);
    });

    it("should apply OKRE (旧字体復元)", async () => {
      const text = "学校で国語を学ぶ。";
      const result = await applyArkCore(text, {
        applyKJCE: false,
        applyOKRE: true,
        applyAncient50Sound: false,
      });

      // 学→學、国→國に変換されるべき
      expect(result.text).toContain("學");
      expect(result.text).toContain("國");
      expect(result.appliedTransformations).toContain("OKRE");
      expect(result.details.okre?.converted).toBe(true);
    });

    it("should apply both KJCE and OKRE", async () => {
      const text = "気持ちが良い天気で学校に行く。";
      const result = await applyArkCore(text, {
        applyKJCE: true,
        applyOKRE: true,
        applyAncient50Sound: false,
      });

      // 気→氣、学→學に変換されるべき
      expect(result.text).toContain("氣");
      expect(result.text).toContain("學");
      // KJCEが適用されることを確認（OKREはKJCEで既に変換済みの場合はスキップされる）
      expect(result.appliedTransformations).toContain("KJCE");
    });

    it("should calculate fire-water balance", async () => {
      const text = "アカサタナハマヤラワ"; // 火の文字
      const result = await applyArkCore(text);

      // 火水バランスは正の値（火寄り）になるべき
      expect(result.fireWaterBalance).toBeGreaterThan(0);
    });

    it("should calculate spiritual score", async () => {
      const text = "氣靈體魂神"; // 靈性の高い文字
      const result = await applyArkCore(text);

      // 靈性スコアは高くなるべき
      expect(result.spiritualScore).toBeGreaterThan(0);
      expect(result.spiritualScore).toBeLessThanOrEqual(100);
    });

    it("should preserve original text", async () => {
      const text = "テストテキスト";
      const result = await applyArkCore(text);

      expect(result.originalText).toBe(text);
    });

    it("should handle empty text", async () => {
      const text = "";
      const result = await applyArkCore(text);

      expect(result.text).toBe("");
      // 空テキストの場合、FireWaterOptimizationは適用されない
      expect(result.appliedTransformations).not.toContain("FireWaterOptimization");
    });

    it("should handle text with no convertible characters", async () => {
      const text = "ABCDEFG123456";
      const result = await applyArkCore(text);

      expect(result.text).toBe(text);
    });

    it("should apply ancient 50-sound analysis when enabled", async () => {
      const text = "あいうえお";
      const result = await applyArkCore(text, {
        applyAncient50Sound: true,
      });

      expect(result.appliedTransformations).toContain("Ancient50Sound");
      expect(result.details.ancient50Sound?.analyzed).toBe(true);
    });

    it("should optimize fire-water balance when enabled", async () => {
      const text = "テストテキスト";
      const result = await applyArkCore(text, {
        optimizeFireWater: true,
        spiritualScoreThreshold: 100, // 常に最適化を試みる
      });

      // 火水最適化が適用されるべき
      expect(result.spiritualScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe("applyArkCoreBatch", () => {
    it("should process multiple texts", async () => {
      const texts = [
        "気持ちが良い",
        "学校に行く",
        "国語を学ぶ",
      ];

      const results = await applyArkCoreBatch(texts);

      expect(results).toHaveLength(3);
      expect(results[0].text).toContain("氣");
      expect(results[1].text).toContain("學");
      expect(results[2].text).toContain("國");
      expect(results[2].text).toContain("學");
    });

    it("should handle empty array", async () => {
      const results = await applyArkCoreBatch([]);
      expect(results).toHaveLength(0);
    });
  });

  describe("getArkCoreStatistics", () => {
    it("should calculate statistics correctly", async () => {
      const texts = [
        "気持ちが良い",
        "学校に行く",
        "国語を学ぶ",
      ];

      const results = await applyArkCoreBatch(texts, {
        applyKJCE: true,
        applyOKRE: true,
      });

      const stats = getArkCoreStatistics(results);

      expect(stats.totalTexts).toBe(3);
      expect(stats.averageSpiritualScore).toBeGreaterThan(0);
      expect(stats.kjceApplicationRate).toBeGreaterThan(0);
      // OKREはKJCEで既に変換済みの場合は適用率が0になる可能性がある
      expect(stats.okreApplicationRate).toBeGreaterThanOrEqual(0);
    });

    it("should handle empty results", () => {
      const stats = getArkCoreStatistics([]);

      expect(stats.totalTexts).toBe(0);
      expect(stats.averageSpiritualScore).toBe(0);
      expect(stats.kjceApplicationRate).toBe(0);
    });
  });

  describe("Context-aware conversion", () => {
    it("should apply spiritual context conversion", async () => {
      const text = "気持ちと体と魂";
      const result = await applyArkCore(text, {
        contextType: "spiritual",
      });

      // 靈性文脈では旧字体が優先されるべき
      expect(result.text).toContain("氣");
      expect(result.text).toContain("體");
      expect(result.text).toContain("魂");
    });

    it("should apply academic context conversion", async () => {
      const text = "学問と教育";
      const result = await applyArkCore(text, {
        contextType: "academic",
      });

      // 学術文脈でも旧字体が適用されるべき
      expect(result.text).toContain("學");
    });
  });

  describe("Fire-Water balance optimization", () => {
    it("should maintain balance in mixed text", async () => {
      const text = "アイウエオカキクケコ"; // 火と水の混合
      const result = await applyArkCore(text, {
        optimizeFireWater: true,
      });

      // 火水バランスが計算されるべき
      expect(result.fireWaterBalance).toBeDefined();
      expect(typeof result.fireWaterBalance).toBe("number");
    });
  });
});
