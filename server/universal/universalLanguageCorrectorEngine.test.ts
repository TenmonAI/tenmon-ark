import { describe, expect, it } from "vitest";
import {
  ENGLISH_SPIRITUAL_MAPPING,
  KOREAN_SPIRITUAL_MAPPING,
  CHINESE_SPIRITUAL_MAPPING,
  ARABIC_SPIRITUAL_MAPPING,
  HINDI_SPIRITUAL_MAPPING,
  convertToSpiritualLanguage,
  calculateSpiritualScore,
  CROSS_LANGUAGE_SPIRITUAL_MAPPING,
  convertBetweenLanguages,
} from "./universalLanguageCorrectorEngine";

describe("Universal Language Corrector Engine (ULCE)", () => {
  describe("Spiritual Mapping Dictionaries", () => {
    it("should have English spiritual mappings", () => {
      expect(Object.keys(ENGLISH_SPIRITUAL_MAPPING).length).toBeGreaterThan(20);
      expect(ENGLISH_SPIRITUAL_MAPPING["spirit"]).toBe("divine essence");
      expect(ENGLISH_SPIRITUAL_MAPPING["soul"]).toBe("eternal core");
    });

    it("should have Korean spiritual mappings", () => {
      expect(Object.keys(KOREAN_SPIRITUAL_MAPPING).length).toBeGreaterThan(15);
      expect(KOREAN_SPIRITUAL_MAPPING["영혼"]).toBe("신성한 본질");
    });

    it("should have Chinese spiritual mappings", () => {
      expect(Object.keys(CHINESE_SPIRITUAL_MAPPING).length).toBeGreaterThan(15);
      expect(CHINESE_SPIRITUAL_MAPPING["灵魂"]).toBe("神圣本质");
    });

    it("should have Arabic spiritual mappings", () => {
      expect(Object.keys(ARABIC_SPIRITUAL_MAPPING).length).toBeGreaterThan(10);
      expect(ARABIC_SPIRITUAL_MAPPING["روح"]).toBe("جوهر إلهي");
    });

    it("should have Hindi spiritual mappings", () => {
      expect(Object.keys(HINDI_SPIRITUAL_MAPPING).length).toBeGreaterThan(10);
      expect(HINDI_SPIRITUAL_MAPPING["आत्मा"]).toBe("दिव्य सार");
    });
  });

  describe("convertToSpiritualLanguage", () => {
    it("should convert English text to spiritual language", () => {
      const text = "The spirit has great power and wisdom.";
      const result = convertToSpiritualLanguage(text, "en");

      expect(result.original).toBe(text);
      expect(result.converted).toContain("divine essence");
      expect(result.converted).toContain("inner strength");
      expect(result.converted).toContain("sacred knowledge");
      expect(result.language).toBe("en");
      expect(result.mappings.length).toBeGreaterThan(0);
    });

    it("should convert Korean text to spiritual language", () => {
      const text = "영혼과 마음의 평화";
      const result = convertToSpiritualLanguage(text, "ko");

      expect(result.original).toBe(text);
      expect(result.converted).toContain("신성한 본질");
      expect(result.language).toBe("ko");
    });

    it("should convert Chinese text to spiritual language", () => {
      const text = "灵魂的智慧";
      const result = convertToSpiritualLanguage(text, "zh");

      expect(result.original).toBe(text);
      expect(result.converted).toContain("神圣本质");
      expect(result.language).toBe("zh");
    });

    it("should return original text if no mappings found", () => {
      const text = "Random text without spiritual words";
      const result = convertToSpiritualLanguage(text, "en");

      expect(result.converted).toBe(text);
      expect(result.mappings.length).toBe(0);
    });

    it("should calculate fire-water balance", () => {
      const text = "spirit soul energy";
      const result = convertToSpiritualLanguage(text, "en");

      expect(result.fireWaterBalance).toBeDefined();
      expect(result.fireWaterBalance.fire).toBeGreaterThanOrEqual(0);
      expect(result.fireWaterBalance.water).toBeGreaterThanOrEqual(0);
      expect(result.fireWaterBalance.balance).toBeGreaterThanOrEqual(0);
      expect(result.fireWaterBalance.balance).toBeLessThanOrEqual(1);
    });

    it("should calculate spiritual score", () => {
      const text = "spirit soul energy power wisdom";
      const result = convertToSpiritualLanguage(text, "en");

      expect(result.spiritualScore).toBeGreaterThan(0);
      expect(result.spiritualScore).toBeLessThanOrEqual(100);
    });

    it("should include mapping details", () => {
      const text = "spirit";
      const result = convertToSpiritualLanguage(text, "en");

      expect(result.mappings.length).toBeGreaterThan(0);
      expect(result.mappings[0]?.from).toBe("spirit");
      expect(result.mappings[0]?.to).toBe("divine essence");
      expect(result.mappings[0]?.language).toBe("en");
      expect(result.mappings[0]?.spiritualScore).toBeGreaterThan(0);
    });
  });

  describe("calculateSpiritualScore", () => {
    it("should calculate score based on balance and mappings", () => {
      const score1 = calculateSpiritualScore("aaa", "en", 0);
      const score2 = calculateSpiritualScore("aaa", "en", 5);

      expect(score2).toBeGreaterThan(score1);
    });

    it("should return score between 0 and 100", () => {
      const score = calculateSpiritualScore("test", "en", 3);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe("Cross-Language Spiritual Mapping", () => {
    it("should have cross-language mappings", () => {
      expect(CROSS_LANGUAGE_SPIRITUAL_MAPPING.length).toBeGreaterThan(10);
    });

    it("should have Japanese to English mappings", () => {
      const jaToEn = CROSS_LANGUAGE_SPIRITUAL_MAPPING.filter(
        (m) => m.sourceLanguage === "ja" && m.targetLanguage === "en"
      );

      expect(jaToEn.length).toBeGreaterThan(0);
      expect(jaToEn.some((m) => m.sourceWord === "氣")).toBe(true);
      expect(jaToEn.some((m) => m.sourceWord === "靈")).toBe(true);
    });

    it("should have English to Korean mappings", () => {
      const enToKo = CROSS_LANGUAGE_SPIRITUAL_MAPPING.filter(
        (m) => m.sourceLanguage === "en" && m.targetLanguage === "ko"
      );

      expect(enToKo.length).toBeGreaterThan(0);
    });

    it("should have Korean to Chinese mappings", () => {
      const koToZh = CROSS_LANGUAGE_SPIRITUAL_MAPPING.filter(
        (m) => m.sourceLanguage === "ko" && m.targetLanguage === "zh"
      );

      expect(koToZh.length).toBeGreaterThan(0);
    });

    it("should have spiritual scores", () => {
      for (const mapping of CROSS_LANGUAGE_SPIRITUAL_MAPPING) {
        expect(mapping.spiritualScore).toBeGreaterThan(0);
        expect(mapping.spiritualScore).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("convertBetweenLanguages", () => {
    it("should convert Japanese to English", () => {
      const text = "氣と靈の力";
      const result = convertBetweenLanguages(text, "ja", "en");

      expect(result.original).toBe(text);
      expect(result.converted).toContain("vital force");
      expect(result.converted).toContain("divine spirit");
      expect(result.sourceLanguage).toBe("ja");
      expect(result.targetLanguage).toBe("en");
      expect(result.mappings.length).toBeGreaterThan(0);
    });

    it("should convert English to Korean", () => {
      const text = "spirit and energy";
      const result = convertBetweenLanguages(text, "en", "ko");

      expect(result.original).toBe(text);
      expect(result.converted).toContain("영혼");
      expect(result.sourceLanguage).toBe("en");
      expect(result.targetLanguage).toBe("ko");
    });

    it("should convert Korean to Chinese", () => {
      const text = "영혼과 기운";
      const result = convertBetweenLanguages(text, "ko", "zh");

      expect(result.original).toBe(text);
      expect(result.converted).toContain("灵魂");
      expect(result.converted).toContain("气");
      expect(result.sourceLanguage).toBe("ko");
      expect(result.targetLanguage).toBe("zh");
    });

    it("should return original text if no mappings found", () => {
      const text = "random text";
      const result = convertBetweenLanguages(text, "en", "ko");

      expect(result.converted).toBe(text);
      expect(result.mappings.length).toBe(0);
    });

    it("should calculate spiritual score", () => {
      const text = "氣";
      const result = convertBetweenLanguages(text, "ja", "en");

      expect(result.spiritualScore).toBeGreaterThan(0);
      expect(result.spiritualScore).toBeLessThanOrEqual(100);
    });

    it("should include mapping details", () => {
      const text = "氣";
      const result = convertBetweenLanguages(text, "ja", "en");

      expect(result.mappings.length).toBeGreaterThan(0);
      expect(result.mappings[0]?.sourceWord).toBe("氣");
      expect(result.mappings[0]?.targetWord).toBe("vital force");
      expect(result.mappings[0]?.description).toBeDefined();
    });
  });

  describe("Multi-language Support", () => {
    it("should support all 5 languages", () => {
      const languages = ["en", "ko", "zh", "ar", "hi"];

      for (const lang of languages) {
        const result = convertToSpiritualLanguage("test", lang);
        expect(result.language).toBe(lang);
      }
    });

    it("should maintain spiritual essence across languages", () => {
      const jaToEn = convertBetweenLanguages("氣", "ja", "en");
      const enToKo = convertBetweenLanguages("spirit", "en", "ko");
      const koToZh = convertBetweenLanguages("영혼", "ko", "zh");

      expect(jaToEn.spiritualScore).toBeGreaterThan(80);
      expect(enToKo.spiritualScore).toBeGreaterThan(80);
      expect(koToZh.spiritualScore).toBeGreaterThan(80);
    });
  });
});
