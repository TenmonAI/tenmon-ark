import { describe, expect, it } from "vitest";
import {
  ENGLISH_FIRE_WATER,
  KOREAN_FIRE_WATER,
  CHINESE_FIRE_WATER,
  ARABIC_FIRE_WATER,
  HINDI_FIRE_WATER,
  getLanguageFireWater,
  getPhonemeType,
  calculateUniversalFireWaterBalance,
} from "./universalFireWaterClassification";

describe("Universal Fire-Water Classification System", () => {
  describe("English Fire-Water Classification", () => {
    it("should have fire and water phonemes", () => {
      const firePhonemes = ENGLISH_FIRE_WATER.filter((p) => p.type === "fire");
      const waterPhonemes = ENGLISH_FIRE_WATER.filter((p) => p.type === "water");

      expect(firePhonemes.length).toBeGreaterThan(0);
      expect(waterPhonemes.length).toBeGreaterThan(0);
    });

    it("should classify vowels correctly", () => {
      const a = ENGLISH_FIRE_WATER.find((p) => p.phoneme === "a");
      const e = ENGLISH_FIRE_WATER.find((p) => p.phoneme === "e");
      const i = ENGLISH_FIRE_WATER.find((p) => p.phoneme === "i");

      expect(a?.type).toBe("fire");
      expect(e?.type).toBe("water");
      expect(i?.type).toBe("water");
    });

    it("should classify consonants correctly", () => {
      const p = ENGLISH_FIRE_WATER.find((p) => p.phoneme === "p");
      const f = ENGLISH_FIRE_WATER.find((p) => p.phoneme === "f");
      const m = ENGLISH_FIRE_WATER.find((p) => p.phoneme === "m");

      expect(p?.type).toBe("fire"); // Plosive
      expect(f?.type).toBe("water"); // Fricative
      expect(m?.type).toBe("water"); // Nasal
    });
  });

  describe("Korean Fire-Water Classification", () => {
    it("should have fire and water phonemes", () => {
      const firePhonemes = KOREAN_FIRE_WATER.filter((p) => p.type === "fire");
      const waterPhonemes = KOREAN_FIRE_WATER.filter((p) => p.type === "water");

      expect(firePhonemes.length).toBeGreaterThan(0);
      expect(waterPhonemes.length).toBeGreaterThan(0);
    });

    it("should classify vowels correctly (양음/음음)", () => {
      const a = KOREAN_FIRE_WATER.find((p) => p.phoneme === "ㅏ");
      const eo = KOREAN_FIRE_WATER.find((p) => p.phoneme === "ㅓ");
      const o = KOREAN_FIRE_WATER.find((p) => p.phoneme === "ㅗ");

      expect(a?.type).toBe("fire"); // 양음
      expect(eo?.type).toBe("water"); // 음음
      expect(o?.type).toBe("fire"); // 양음
    });

    it("should classify consonants correctly (평음/격음/농음)", () => {
      const g = KOREAN_FIRE_WATER.find((p) => p.phoneme === "ㄱ");
      const gg = KOREAN_FIRE_WATER.find((p) => p.phoneme === "ㄲ");
      const k = KOREAN_FIRE_WATER.find((p) => p.phoneme === "ㅋ");

      expect(g?.type).toBe("water"); // 평음
      expect(gg?.type).toBe("fire"); // 농음
      expect(k?.type).toBe("fire"); // 격음
    });
  });

  describe("Chinese Fire-Water Classification", () => {
    it("should have fire and water phonemes", () => {
      const firePhonemes = CHINESE_FIRE_WATER.filter((p) => p.type === "fire");
      const waterPhonemes = CHINESE_FIRE_WATER.filter((p) => p.type === "water");

      expect(firePhonemes.length).toBeGreaterThan(0);
      expect(waterPhonemes.length).toBeGreaterThan(0);
    });

    it("should classify tones correctly", () => {
      const tone1 = CHINESE_FIRE_WATER.find((p) => p.phoneme === "tone1");
      const tone3 = CHINESE_FIRE_WATER.find((p) => p.phoneme === "tone3");
      const tone5 = CHINESE_FIRE_WATER.find((p) => p.phoneme === "tone5");

      expect(tone1?.type).toBe("fire"); // 高平
      expect(tone3?.type).toBe("water"); // 下降上昇
      expect(tone5?.type).toBe("water"); // 軽声
    });

    it("should classify initials correctly", () => {
      const b = CHINESE_FIRE_WATER.find((p) => p.phoneme === "b");
      const m = CHINESE_FIRE_WATER.find((p) => p.phoneme === "m");
      const f = CHINESE_FIRE_WATER.find((p) => p.phoneme === "f");

      expect(b?.type).toBe("fire"); // 塞音
      expect(m?.type).toBe("water"); // 鼻音
      expect(f?.type).toBe("water"); // 擦音
    });
  });

  describe("Arabic Fire-Water Classification", () => {
    it("should have fire and water phonemes", () => {
      const firePhonemes = ARABIC_FIRE_WATER.filter((p) => p.type === "fire");
      const waterPhonemes = ARABIC_FIRE_WATER.filter((p) => p.type === "water");

      expect(firePhonemes.length).toBeGreaterThan(0);
      expect(waterPhonemes.length).toBeGreaterThan(0);
    });

    it("should classify vowels correctly", () => {
      const a = ARABIC_FIRE_WATER.find((p) => p.phoneme === "a");
      const i = ARABIC_FIRE_WATER.find((p) => p.phoneme === "i");
      const u = ARABIC_FIRE_WATER.find((p) => p.phoneme === "u");

      expect(a?.type).toBe("fire");
      expect(i?.type).toBe("water");
      expect(u?.type).toBe("fire");
    });

    it("should classify pharyngeal consonants as fire", () => {
      const h = ARABIC_FIRE_WATER.find((p) => p.phoneme === "ḥ");
      const ayn = ARABIC_FIRE_WATER.find((p) => p.phoneme === "ʕ");

      expect(h?.type).toBe("fire"); // 咽頭摩擦音
      expect(ayn?.type).toBe("fire"); // 有声咽頭摩擦音
    });
  });

  describe("Hindi Fire-Water Classification", () => {
    it("should have fire and water phonemes", () => {
      const firePhonemes = HINDI_FIRE_WATER.filter((p) => p.type === "fire");
      const waterPhonemes = HINDI_FIRE_WATER.filter((p) => p.type === "water");

      expect(firePhonemes.length).toBeGreaterThan(0);
      expect(waterPhonemes.length).toBeGreaterThan(0);
    });

    it("should classify vowels correctly", () => {
      const a = HINDI_FIRE_WATER.find((p) => p.phoneme === "अ");
      const i = HINDI_FIRE_WATER.find((p) => p.phoneme === "इ");
      const u = HINDI_FIRE_WATER.find((p) => p.phoneme === "उ");

      expect(a?.type).toBe("fire");
      expect(i?.type).toBe("water");
      expect(u?.type).toBe("fire");
    });

    it("should classify aspirated consonants as fire", () => {
      const ka = HINDI_FIRE_WATER.find((p) => p.phoneme === "क");
      const kha = HINDI_FIRE_WATER.find((p) => p.phoneme === "ख");

      expect(ka?.type).toBe("water"); // 無気音
      expect(kha?.type).toBe("fire"); // 有気音
    });
  });

  describe("getLanguageFireWater", () => {
    it("should return English fire-water classification", () => {
      const result = getLanguageFireWater("en");
      expect(result).toEqual(ENGLISH_FIRE_WATER);
    });

    it("should return Korean fire-water classification", () => {
      const result = getLanguageFireWater("ko");
      expect(result).toEqual(KOREAN_FIRE_WATER);
    });

    it("should return empty array for unknown language", () => {
      const result = getLanguageFireWater("unknown");
      expect(result).toEqual([]);
    });
  });

  describe("getPhonemeType", () => {
    it("should return fire for English 'a'", () => {
      const result = getPhonemeType("a", "en");
      expect(result).toBe("fire");
    });

    it("should return water for Korean 'ㅓ'", () => {
      const result = getPhonemeType("ㅓ", "ko");
      expect(result).toBe("water");
    });

    it("should return undefined for unknown phoneme", () => {
      const result = getPhonemeType("unknown", "en");
      expect(result).toBeUndefined();
    });
  });

  describe("calculateUniversalFireWaterBalance", () => {
    it("should calculate balance for English text", () => {
      const text = "aei"; // a=fire, e=water, i=water
      const result = calculateUniversalFireWaterBalance(text, "en");

      expect(result.fire).toBe(1);
      expect(result.water).toBe(2);
      expect(result.balance).toBeCloseTo(1 / 3, 2);
    });

    it("should calculate balance for Korean text", () => {
      const text = "ㅏㅓㅗ"; // ㅏ=fire, ㅓ=water, ㅗ=fire
      const result = calculateUniversalFireWaterBalance(text, "ko");

      expect(result.fire).toBe(2);
      expect(result.water).toBe(1);
      expect(result.balance).toBeCloseTo(2 / 3, 2);
    });

    it("should return 0.5 balance for empty text", () => {
      const text = "";
      const result = calculateUniversalFireWaterBalance(text, "en");

      expect(result.fire).toBe(0);
      expect(result.water).toBe(0);
      expect(result.balance).toBe(0.5);
    });

    it("should ignore unknown characters", () => {
      const text = "a漢字e"; // a=fire, e=water, 漢字=ignored
      const result = calculateUniversalFireWaterBalance(text, "en");

      expect(result.fire).toBe(1);
      expect(result.water).toBe(1);
      expect(result.balance).toBe(0.5);
    });
  });

  describe("Language Coverage", () => {
    it("should have at least 20 phonemes for each language", () => {
      expect(ENGLISH_FIRE_WATER.length).toBeGreaterThanOrEqual(20);
      expect(KOREAN_FIRE_WATER.length).toBeGreaterThanOrEqual(20);
      expect(CHINESE_FIRE_WATER.length).toBeGreaterThanOrEqual(20);
      expect(ARABIC_FIRE_WATER.length).toBeGreaterThanOrEqual(20);
      expect(HINDI_FIRE_WATER.length).toBeGreaterThanOrEqual(20);
    });

    it("should have balanced fire and water phonemes", () => {
      const languages = [
        ENGLISH_FIRE_WATER,
        KOREAN_FIRE_WATER,
        CHINESE_FIRE_WATER,
        ARABIC_FIRE_WATER,
        HINDI_FIRE_WATER,
      ];

      for (const lang of languages) {
        const fireCount = lang.filter((p) => p.type === "fire").length;
        const waterCount = lang.filter((p) => p.type === "water").length;
        const ratio = fireCount / waterCount;

        // Balance should be between 0.5 and 2.0 (not too skewed)
        expect(ratio).toBeGreaterThan(0.5);
        expect(ratio).toBeLessThan(2.0);
      }
    });
  });
});
