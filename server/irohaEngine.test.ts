import { describe, expect, it, beforeAll } from "vitest";
import { analyzeIroha, getIrohaByOrder, getAllIrohaInterpretations } from "./irohaEngine";
import { getDb } from "./db";

describe("いろは言灵解析エンジン", () => {
  beforeAll(async () => {
    // データベース接続を確認
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection failed");
    }
  });

  describe("analyzeIroha", () => {
    it("ひらがなを正しく抽出する", async () => {
      const result = await analyzeIroha("いろはにほへと ちりぬるを");
      
      expect(result.extractedCharacters).toEqual([
        "い", "ろ", "は", "に", "ほ", "へ", "と", "ち", "り", "ぬ", "る", "を"
      ]);
      expect(result.interpretations.length).toBe(12);
    });

    it("カタカナと漢字を無視する", async () => {
      const result = await analyzeIroha("いろは アイウ 漢字");
      
      expect(result.extractedCharacters).toEqual(["い", "ろ", "は"]);
      expect(result.interpretations.length).toBe(3);
    });

    it("生命の法則のサマリーを生成する", async () => {
      const result = await analyzeIroha("いろは");
      
      expect(result.lifePrinciplesSummary).toBeTruthy();
      expect(result.lifePrinciplesSummary.length).toBeGreaterThan(0);
    });

    it("全体的な解釈を生成する", async () => {
      const result = await analyzeIroha("いろは");
      
      expect(result.overallInterpretation).toBeTruthy();
      expect(result.overallInterpretation.length).toBeGreaterThan(0);
    });

    it("いろは順序1（い）を正しく解釈する", async () => {
      const result = await analyzeIroha("い");
      
      expect(result.interpretations.length).toBe(1);
      const interpretation = result.interpretations[0];
      
      expect(interpretation?.character).toBe("い");
      expect(interpretation?.order).toBe(1);
      expect(interpretation?.reading).toBe("イ");
      expect(interpretation?.interpretation).toContain("生命の始まり");
    });

    it("複数のいろは文字を解釈する", async () => {
      const result = await analyzeIroha("いろはにほへと");
      
      expect(result.interpretations.length).toBe(7);
      
      // 各文字の順序が正しいか確認
      const orders = result.interpretations.map(i => i.order);
      expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });
  });

  describe("getIrohaByOrder", () => {
    it("順序番号でいろは文字を取得できる", async () => {
      const iroha = await getIrohaByOrder(1);
      
      expect(iroha).toBeDefined();
      expect(iroha?.order).toBe(1);
      expect(iroha?.character).toBe("い");
      expect(iroha?.reading).toBe("イ");
    });

    it("順序番号2（ろ）を取得できる", async () => {
      const iroha = await getIrohaByOrder(2);
      
      expect(iroha).toBeDefined();
      expect(iroha?.order).toBe(2);
      expect(iroha?.character).toBe("ろ");
    });

    it("順序番号47（す）を取得できる", async () => {
      const iroha = await getIrohaByOrder(47);
      
      expect(iroha).toBeDefined();
      expect(iroha?.order).toBe(47);
      expect(iroha?.character).toBe("す");
    });

    it("存在しない順序番号の場合undefinedを返す", async () => {
      const iroha = await getIrohaByOrder(999);
      
      expect(iroha).toBeUndefined();
    });
  });

  describe("getAllIrohaInterpretations", () => {
    it("47文字すべてを取得できる", async () => {
      const interpretations = await getAllIrohaInterpretations();
      
      expect(interpretations.length).toBe(47);
    });

    it("順序が1から47まで連続している", async () => {
      const interpretations = await getAllIrohaInterpretations();
      
      const orders = interpretations.map(i => i.order).sort((a, b) => a - b);
      expect(orders).toEqual(Array.from({ length: 47 }, (_, i) => i + 1));
    });

    it("すべての文字に解釈と生命の法則が含まれている", async () => {
      const interpretations = await getAllIrohaInterpretations();
      
      interpretations.forEach(interpretation => {
        expect(interpretation.character).toBeTruthy();
        expect(interpretation.reading).toBeTruthy();
        expect(interpretation.interpretation).toBeTruthy();
        expect(interpretation.lifePrinciple).toBeTruthy();
      });
    });

    it("いろは順序が正しい（い・ろ・は・に・ほ・へ・と...）", async () => {
      const interpretations = await getAllIrohaInterpretations();
      
      // 最初の7文字を確認
      const first7 = interpretations.slice(0, 7).map(i => i.character);
      expect(first7).toEqual(["い", "ろ", "は", "に", "ほ", "へ", "と"]);
    });
  });
});
