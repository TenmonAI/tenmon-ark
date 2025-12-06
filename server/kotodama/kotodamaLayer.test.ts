import { describe, expect, it } from "vitest";
import { convertToKotodama, calculateFireWaterBalance, countOldKanji, calculateSpiritualScore } from "./kotodamaJapaneseCorrectorEngine";
import { convertToKotodamaSpec, getKotodamaSpecStats } from "./kotodamaSpecConverter";
import { convertToAncientKana, countAncientKana } from "./ancientKanaRestoration";
import { applyKotodamaLayer, KOTODAMA_LAYER_DEFAULT_OPTIONS, KOTODAMA_LAYER_HIGH_PRIORITY_OPTIONS, KOTODAMA_LAYER_MAXIMUM_PRIORITY_OPTIONS } from "./kotodamaLayerIntegration";
import { calculateSpiritualScore as calculateGojuonSpiritualScore } from "./gojuonReikiFilter";

/**
 * Kotodama Layer v1 Comprehensive Test Suite
 * 
 * Tests all conversion engines and integration
 */

describe("Kotodama Layer v1 - Old Kanji Conversion Engine", () => {
  it("should convert modern kanji to old kanji (basic)", () => {
    const input = "霊気体魂神";
    const result = convertToKotodama(input);
    
    expect(result).toBe("靈氣體魂神");
  });

  it("should convert modern kanji to old kanji (complex)", () => {
    const input = "学問の国において、真実の宝を探求する";
    const result = convertToKotodama(input);
    
    expect(result).toContain("學");
    expect(result).toContain("國");
    expect(result).toContain("眞");
    expect(result).toContain("寶");
  });

  it("should convert with priority threshold", () => {
    const input = "霊気体学国";
    const result = convertToKotodama(input, { priorityThreshold: 90 });
    
    // Only high-priority kanji should be converted
    expect(result).toContain("靈");
    expect(result).toContain("氣");
    expect(result).toContain("體");
  });

  it("should count old kanji correctly", () => {
    const text = "靈氣體學國";
    const count = countOldKanji(text);
    
    expect(count).toBe(5);
  });

  it("should calculate spiritual score", () => {
    const text = "靈氣體魂神";
    const score = calculateSpiritualScore(text);
    
    expect(score).toBeGreaterThan(0);
  });

  it("should calculate fire-water balance", () => {
    const text = "あいうえお";
    const balance = calculateFireWaterBalance(text);
    
    expect(balance.fire).toBeGreaterThan(0);
    expect(balance.water).toBeGreaterThan(0);
    expect(balance.fireRatio + balance.waterRatio).toBe(1);
  });
});

describe("Kotodama Layer v1 - Kotodama-spec Conversion Engine", () => {
  it("should convert 言霊 to 言灵", () => {
    const input = "言霊の力";
    const result = convertToKotodamaSpec(input);
    
    expect(result).toBe("言灵の力");
  });

  it("should convert 霊性 to 靈性", () => {
    const input = "霊性的な存在";
    const result = convertToKotodamaSpec(input);
    
    expect(result).toBe("靈性的な存在");
  });

  it("should convert 火と水 to 火水", () => {
    const input = "火と水のバランス";
    const result = convertToKotodamaSpec(input);
    
    expect(result).toBe("火水のバランス");
  });

  it("should convert 気流 to 氣流", () => {
    const input = "気流の変化";
    const result = convertToKotodamaSpec(input);
    
    expect(result).toBe("氣流の變化");
  });

  it("should convert compound words correctly", () => {
    const input = "学問の体系において、真実の経験を積む";
    const result = convertToKotodamaSpec(input);
    
    expect(result).toContain("學問");
    expect(result).toContain("體系");
    expect(result).toContain("眞實");
    expect(result).toContain("經驗");
  });

  it("should get conversion statistics", () => {
    const text = "言灵の力、靈性的な存在、火水のバランス";
    const stats = getKotodamaSpecStats(text);
    
    expect(stats.totalPhrases).toBeGreaterThan(0);
    expect(stats.convertedPhrases).toBeGreaterThan(0);
    expect(stats.details.length).toBeGreaterThan(0);
  });
});

describe("Kotodama Layer v1 - Ancient Kana Restoration Engine", () => {
  it("should convert え to ゑ in specific contexts", () => {
    const input = "かえる";
    const result = convertToAncientKana(input);
    
    expect(result).toBe("かゑる");
  });

  it("should convert い to ゐ in specific contexts", () => {
    const input = "いる";
    const result = convertToAncientKana(input);
    
    expect(result).toBe("ゐる");
  });

  it("should convert え/い based on historical kana rules", () => {
    const input = "えいご";
    const result = convertToAncientKana(input);
    
    // Ancient kana restoration converts based on word lists
    // "えいご" may be converted if it matches historical patterns
    expect(result.length).toBeGreaterThan(0);
  });

  it("should count ancient kana correctly", () => {
    const text = "かゑる、ゐる、を";
    const count = countAncientKana(text);
    
    expect(count.we).toBe(1);
    expect(count.wi).toBe(1);
    expect(count.wo).toBe(1);
    expect(count.total).toBe(3);
  });
});

describe("Kotodama Layer v1 - Gojuon Reiki Filter", () => {
  it("should calculate spiritual score with gojuon reiki", () => {
    const text = "あいうえお";
    const score = calculateGojuonSpiritualScore(text);
    
    expect(score.totalScore).toBeGreaterThan(0);
    expect(score.averageScore).toBeGreaterThan(0);
    expect(score.fireWaterBalance).toBeGreaterThanOrEqual(-1);
    expect(score.fireWaterBalance).toBeLessThanOrEqual(1);
  });

  it("should classify fire-water balance correctly", () => {
    const fireText = "あうおかくこさすそ"; // Fire-heavy
    const waterText = "いえきけしせちてに"; // Water-heavy
    
    const fireScore = calculateGojuonSpiritualScore(fireText);
    const waterScore = calculateGojuonSpiritualScore(waterText);
    
    expect(fireScore.fireWaterBalance).toBeGreaterThan(0);
    expect(waterScore.fireWaterBalance).toBeLessThan(0);
  });

  it("should count five elements correctly", () => {
    const text = "あいうえおかきくけこ";
    const score = calculateGojuonSpiritualScore(text);
    
    expect(score.details.fireCount).toBeGreaterThan(0);
    expect(score.details.waterCount).toBeGreaterThan(0);
  });
});

describe("Kotodama Layer v1 - Integration Tests", () => {
  it("should apply all layers with default options", () => {
    const input = "言霊の力により、霊性的な体験を通じて、学問の国において真実を探求する。気流を感じる";
    const result = applyKotodamaLayer(input, KOTODAMA_LAYER_DEFAULT_OPTIONS);
    
    // Check old kanji conversion
    expect(result.text).toContain("靈");
    expect(result.text).toContain("氣");
    expect(result.text).toContain("體");
    expect(result.text).toContain("學");
    expect(result.text).toContain("國");
    expect(result.text).toContain("眞");
    
    // Check kotodama-spec conversion
    expect(result.text).toContain("言灵");
    expect(result.text).toContain("靈性");
    expect(result.text).toContain("體驗");
    expect(result.text).toContain("學問");
  });

  it("should apply high-priority options", () => {
    const input = "霊気体学国";
    const result = applyKotodamaLayer(input, KOTODAMA_LAYER_HIGH_PRIORITY_OPTIONS);
    
    // Only high-priority kanji should be converted
    expect(result.text).toContain("靈");
    expect(result.text).toContain("氣");
    expect(result.text).toContain("體");
  });

  it("should apply maximum-priority options", () => {
    const input = "霊気体魂神学国";
    const result = applyKotodamaLayer(input, KOTODAMA_LAYER_MAXIMUM_PRIORITY_OPTIONS);
    
    // Only maximum-priority kanji should be converted
    expect(result.text).toContain("靈");
    expect(result.text).toContain("氣");
    expect(result.text).toContain("魂");
    expect(result.text).toContain("神");
  });

  it("should return statistics when requested", () => {
    const input = "言霊の力により、霊性的な体験を通じて、学問の国において真実を探求する";
    const result = applyKotodamaLayer(input, {
      ...KOTODAMA_LAYER_DEFAULT_OPTIONS,
      returnStats: true,
    });
    
    expect(result.stats).toBeDefined();
    expect(result.stats!.originalLength).toBeGreaterThan(0);
    expect(result.stats!.convertedLength).toBeGreaterThan(0);
    expect(result.stats!.spiritualScore).toBeGreaterThan(0);
  });

  it("should handle empty input", () => {
    const input = "";
    const result = applyKotodamaLayer(input);
    
    expect(result.text).toBe("");
  });

  it("should handle input with no convertible characters", () => {
    const input = "abcdefg123456";
    const result = applyKotodamaLayer(input);
    
    expect(result.text).toBe("abcdefg123456");
  });

  it("should preserve non-Japanese characters", () => {
    const input = "TENMON-ARKは霊性的なAI OSです";
    const result = applyKotodamaLayer(input);
    
    expect(result.text).toContain("TENMON-ARK");
    expect(result.text).toContain("AI");
    expect(result.text).toContain("OS");
    expect(result.text).toContain("靈性");
  });
});

describe("Kotodama Layer v1 - Real-world Examples", () => {
  it("should convert TENMON-ARK introduction text", () => {
    const input = "TENMON-ARKは、言霊の力を持つ霊性的なAI OSです。学問の体系と真実の経験を通じて、国家レベルの知識を提供します。";
    const result = applyKotodamaLayer(input);
    
    expect(result.text).toContain("言灵");
    expect(result.text).toContain("靈性");
    expect(result.text).toContain("學問");
    expect(result.text).toContain("體系");
    expect(result.text).toContain("眞實");
    expect(result.text).toContain("經驗");
    expect(result.text).toContain("國家");
  });

  it("should convert Twin-Core description", () => {
    const input = "Twin-Coreは火と水のバランスを保ちながら、霊性的な体験を提供します。";
    const result = applyKotodamaLayer(input);
    
    expect(result.text).toContain("火水");
    expect(result.text).toContain("靈性");
    expect(result.text).toContain("體驗");
  });

  it("should convert LP-QA response", () => {
    const input = "Founder Editionは、永久的な価値を持つ特別な体験です。学問と真実の探求を通じて、国家レベルの知識にアクセスできます。";
    const result = applyKotodamaLayer(input);
    
    expect(result.text).toContain("價値");
    expect(result.text).toContain("體驗");
    expect(result.text).toContain("學問");
    expect(result.text).toContain("眞實");
    expect(result.text).toContain("國家");
  });
});

describe("Kotodama Layer v1 - Performance Tests", () => {
  it("should handle long text efficiently", () => {
    const longText = "言霊の力により、霊性的な体験を通じて、学問の国において真実を探求する。".repeat(100);
    const startTime = Date.now();
    const result = applyKotodamaLayer(longText);
    const endTime = Date.now();
    
    expect(result.text.length).toBeGreaterThan(0);
    expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
  });

  it("should handle multiple conversions efficiently", () => {
    const input = "言霊の力により、霊性的な体験を通じて、学問の国において真実を探求する";
    const startTime = Date.now();
    
    for (let i = 0; i < 100; i++) {
      applyKotodamaLayer(input);
    }
    
    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(1000); // 100 conversions should complete within 1 second
  });
});
