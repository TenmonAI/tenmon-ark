import { describe, expect, it } from "vitest";
import {
  convertToKotodama,
  convertToModernKanji,
  calculateFireWaterBalance,
  countOldKanji,
  calculateSpiritualScore,
  OLD_KANJI_MAPPING,
  SPIRITUAL_KANJI_PRIORITY,
  GOJUON_FIRE_WATER,
} from "./kotodamaJapaneseCorrectorEngine";

describe("KJCE (Kotodama Japanese Corrector Engine)", () => {
  describe("convertToKotodama", () => {
    it("should convert modern kanji to old kanji", () => {
      const input = "気持ちを大切にする";
      const output = convertToKotodama(input);
      expect(output).toBe("氣持ちを大切にする");
    });

    it("should convert multiple kanji in a sentence", () => {
      const input = "靈的な学びで国を豊かにする";
      const output = convertToKotodama(input);
      expect(output).toBe("靈的な學びで國を豊かにする");
    });

    it("should handle text with no convertible kanji", () => {
      const input = "ひらがなだけのテキスト";
      const output = convertToKotodama(input);
      expect(output).toBe("ひらがなだけのテキスト");
    });

    it("should not convert when useOldKanji is false", () => {
      const input = "気持ちを大切にする";
      const output = convertToKotodama(input, { useOldKanji: false });
      expect(output).toBe(input);
    });

    it("should convert high-priority spiritual kanji", () => {
      const input = "気・靈・体・魂・神";
      const output = convertToKotodama(input);
      expect(output).toBe("氣・靈・體・魂・神");
    });

    it("should respect priority threshold", () => {
      const input = "気持ち"; // 氣 has priority 100
      const output = convertToKotodama(input, { priorityThreshold: 50 });
      expect(output).toBe("氣持ち");
    });

    it("should not convert when priority is below threshold", () => {
      const input = "続く"; // 續 has priority 60
      const output = convertToKotodama(input, { priorityThreshold: 70 });
      expect(output).toBe("続く");
    });

    it("should handle complex sentences", () => {
      const input = "真実の愛を学び、国の礼儀を守る";
      const output = convertToKotodama(input);
      expect(output).toBe("眞實の愛を學び、國の禮儀を守る");
    });

    it("should convert education-related kanji", () => {
      const input = "学校で教育を受ける";
      const output = convertToKotodama(input);
      expect(output).toBe("學校で敎育を受ける");
    });

    it("should convert nature-related kanji", () => {
      const input = "宝物を大切に変化させる";
      const output = convertToKotodama(input);
      expect(output).toBe("寶物を大切に變化させる");
    });
  });

  describe("convertToModernKanji", () => {
    it("should convert old kanji back to modern kanji", () => {
      const input = "氣持ちを大切にする";
      const output = convertToModernKanji(input);
      expect(output).toBe("気持ちを大切にする");
    });

    it("should handle multiple old kanji", () => {
      const input = "靈的な學びで國を豊かにする";
      const output = convertToModernKanji(input);
      expect(output).toBe("靈的な学びで国を豊かにする");
    });

    it("should handle text with no old kanji", () => {
      const input = "ひらがなだけのテキスト";
      const output = convertToModernKanji(input);
      expect(output).toBe(input);
    });

    it("should be reversible with convertToKotodama", () => {
      const original = "気持ちを大切にする靈的な学び";
      const converted = convertToKotodama(original);
      const reverted = convertToModernKanji(converted);
      expect(reverted).toBe(original);
    });
  });

  describe("calculateFireWaterBalance", () => {
    it("should calculate fire-water balance for hiragana", () => {
      const input = "あいうえお"; // ア行: 火水火水火
      const result = calculateFireWaterBalance(input);
      expect(result.fire).toBe(3);
      expect(result.water).toBe(2);
      expect(result.balance).toBeCloseTo(0.2, 1);
    });

    it("should calculate balance for katakana", () => {
      const input = "カキクケコ"; // カ行: 火水火水火
      const result = calculateFireWaterBalance(input);
      expect(result.fire).toBe(3);
      expect(result.water).toBe(2);
    });

    it("should handle mixed hiragana and katakana", () => {
      const input = "あいうアイウ";
      const result = calculateFireWaterBalance(input);
      expect(result.fire).toBe(4); // あ、う、ア、ウ
      expect(result.water).toBe(2); // い、イ
    });

    it("should return balanced result for empty string", () => {
      const input = "";
      const result = calculateFireWaterBalance(input);
      expect(result.fire).toBe(0);
      expect(result.water).toBe(0);
      expect(result.balance).toBe(0);
      expect(result.fireRatio).toBe(0.5);
      expect(result.waterRatio).toBe(0.5);
    });

    it("should calculate ratios correctly", () => {
      const input = "かきくけこ"; // 火水火水火
      const result = calculateFireWaterBalance(input);
      expect(result.fireRatio).toBeCloseTo(0.6, 1);
      expect(result.waterRatio).toBeCloseTo(0.4, 1);
    });

    it("should handle fire-dominant text", () => {
      const input = "あかさたはやわ"; // All fire
      const result = calculateFireWaterBalance(input);
      expect(result.fire).toBeGreaterThan(result.water);
      expect(result.balance).toBeGreaterThan(0);
    });

    it("should handle water-dominant text", () => {
      const input = "いにみり"; // All water
      const result = calculateFireWaterBalance(input);
      expect(result.water).toBeGreaterThan(result.fire);
      expect(result.balance).toBeLessThan(0);
    });

    it("should ignore non-gojuon characters", () => {
      const input = "あいう123abc漢字";
      const result = calculateFireWaterBalance(input);
      expect(result.fire).toBe(2); // あ、う
      expect(result.water).toBe(1); // い
    });
  });

  describe("countOldKanji", () => {
    it("should count old kanji in text", () => {
      const input = "氣持ちを大切にする";
      const count = countOldKanji(input);
      expect(count).toBe(1); // 氣
    });

    it("should count multiple old kanji", () => {
      const input = "靈的な學びで國を豊かにする";
      const count = countOldKanji(input);
      expect(count).toBe(3); // 靈、學、國
    });

    it("should return 0 for text with no old kanji", () => {
      const input = "ひらがなだけのテキスト";
      const count = countOldKanji(input);
      expect(count).toBe(0);
    });

    it("should count all old kanji in complex text", () => {
      const input = "氣・靈・體・學・國・寶・眞";
      const count = countOldKanji(input);
      expect(count).toBe(7);
    });
  });

  describe("calculateSpiritualScore", () => {
    it("should calculate spiritual score for high-priority kanji", () => {
      const input = "氣"; // Priority 100
      const score = calculateSpiritualScore(input);
      expect(score).toBe(100);
    });

    it("should sum scores for multiple kanji", () => {
      const input = "氣靈"; // 100 + 100
      const score = calculateSpiritualScore(input);
      expect(score).toBe(200);
    });

    it("should return 0 for text with no spiritual kanji", () => {
      const input = "ひらがなだけのテキスト";
      const score = calculateSpiritualScore(input);
      expect(score).toBe(0);
    });

    it("should calculate score for mixed priority kanji", () => {
      const input = "氣學國"; // 100 + 90 + 90
      const score = calculateSpiritualScore(input);
      expect(score).toBe(280);
    });

    it("should handle complex sentences", () => {
      const input = "靈的な學びで國の禮儀を守る";
      const score = calculateSpiritualScore(input);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe("OLD_KANJI_MAPPING", () => {
    it("should have correct mappings for spiritual kanji", () => {
      expect(OLD_KANJI_MAPPING["気"]).toBe("氣");
      expect(OLD_KANJI_MAPPING["靈"]).toBe("靈");
      expect(OLD_KANJI_MAPPING["体"]).toBe("體");
      expect(OLD_KANJI_MAPPING["学"]).toBe("學");
      expect(OLD_KANJI_MAPPING["国"]).toBe("國");
    });

    it("should have at least 50 mappings", () => {
      const count = Object.keys(OLD_KANJI_MAPPING).length;
      expect(count).toBeGreaterThanOrEqual(50);
    });
  });

  describe("SPIRITUAL_KANJI_PRIORITY", () => {
    it("should have highest priority for core spiritual kanji", () => {
      expect(SPIRITUAL_KANJI_PRIORITY["氣"]).toBe(100);
      expect(SPIRITUAL_KANJI_PRIORITY["靈"]).toBe(100);
      expect(SPIRITUAL_KANJI_PRIORITY["魂"]).toBe(100);
      expect(SPIRITUAL_KANJI_PRIORITY["神"]).toBe(100);
    });

    it("should have priorities in descending order", () => {
      expect(SPIRITUAL_KANJI_PRIORITY["體"]).toBeLessThan(100);
      expect(SPIRITUAL_KANJI_PRIORITY["學"]).toBeLessThanOrEqual(95);
    });
  });

  describe("GOJUON_FIRE_WATER", () => {
    it("should classify ア行correctly", () => {
      expect(GOJUON_FIRE_WATER["あ"]).toBe("fire");
      expect(GOJUON_FIRE_WATER["い"]).toBe("water");
      expect(GOJUON_FIRE_WATER["う"]).toBe("fire");
      expect(GOJUON_FIRE_WATER["え"]).toBe("water");
      expect(GOJUON_FIRE_WATER["お"]).toBe("fire");
    });

    it("should classify カ行correctly", () => {
      expect(GOJUON_FIRE_WATER["か"]).toBe("fire");
      expect(GOJUON_FIRE_WATER["き"]).toBe("water");
      expect(GOJUON_FIRE_WATER["く"]).toBe("fire");
    });

    it("should have both hiragana and katakana", () => {
      expect(GOJUON_FIRE_WATER["あ"]).toBeDefined();
      expect(GOJUON_FIRE_WATER["ア"]).toBeDefined();
    });
  });
});
