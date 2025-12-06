import { describe, expect, it, beforeAll } from "vitest";
import { analyzeAmatsuKanagi, getPatternByNumber, getAllPatterns, getAllBasicMovements } from "./amatsuKanagiEngine";
import { getDb } from "./db";

describe("天津金木演算エンジン", () => {
  beforeAll(async () => {
    // データベース接続を確認
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection failed");
    }
  });

  describe("analyzeAmatsuKanagi", () => {
    it("カタカナを正しく抽出する", async () => {
      const result = await analyzeAmatsuKanagi("アイウエオ カキクケコ");
      
      expect(result.extractedSounds).toEqual(["ア", "イ", "ウ", "エ", "オ", "カ", "キ", "ク", "ケ", "コ"]);
      expect(result.patterns.length).toBe(10);
    });

    it("ひらがなと漢字を無視する", async () => {
      const result = await analyzeAmatsuKanagi("あいうえお アイウエオ 漢字");
      
      expect(result.extractedSounds).toEqual(["ア", "イ", "ウ", "エ", "オ"]);
      expect(result.patterns.length).toBe(5);
    });

    it("火水エネルギーバランスを正しく計算する", async () => {
      const result = await analyzeAmatsuKanagi("アイウエオ");
      
      expect(result.energyBalance.fire).toBeGreaterThanOrEqual(0);
      expect(result.energyBalance.water).toBeGreaterThanOrEqual(0);
      expect(result.energyBalance.balance).toBeGreaterThanOrEqual(-1);
      expect(result.energyBalance.balance).toBeLessThanOrEqual(1);
    });

    it("螺旋構造を正しく計算する", async () => {
      const result = await analyzeAmatsuKanagi("アイウエオ");
      
      expect(result.spiralStructure.leftRotation).toBeGreaterThanOrEqual(0);
      expect(result.spiralStructure.rightRotation).toBeGreaterThanOrEqual(0);
      expect(result.spiralStructure.innerConvergence).toBeGreaterThanOrEqual(0);
      expect(result.spiralStructure.outerDivergence).toBeGreaterThanOrEqual(0);
    });

    it("中心霊（ヤイ・ヤエ）を正しく識別する", async () => {
      const result = await analyzeAmatsuKanagi("イエ");
      
      const yaiPattern = result.patterns.find(p => p.number === 18);
      const yaePattern = result.patterns.find(p => p.number === 20);
      
      expect(yaiPattern).toBeDefined();
      expect(yaiPattern?.special).toBe(true);
      expect(yaiPattern?.meaning).toContain("完全内集");
      
      expect(yaePattern).toBeDefined();
      expect(yaePattern?.special).toBe(true);
      expect(yaePattern?.meaning).toContain("完全外発");
    });

    it("解釈を自動生成する", async () => {
      const result = await analyzeAmatsuKanagi("アイウエオ");
      
      expect(result.interpretation).toBeTruthy();
      expect(result.interpretation.length).toBeGreaterThan(0);
    });
  });

  describe("getPatternByNumber", () => {
    it("番号でパターンを取得できる", async () => {
      const pattern = await getPatternByNumber(1);
      
      expect(pattern).toBeDefined();
      expect(pattern?.number).toBe(1);
      expect(pattern?.sound).toBe("ホ");
    });

    it("中心霊（No.18 ヤイ）を取得できる", async () => {
      const pattern = await getPatternByNumber(18);
      
      expect(pattern).toBeDefined();
      expect(pattern?.number).toBe(18);
      expect(pattern?.sound).toBe("イ");
      expect(pattern?.special).toBe(true);
      expect(pattern?.meaning).toContain("完全内集");
    });

    it("中心霊（No.20 ヤエ）を取得できる", async () => {
      const pattern = await getPatternByNumber(20);
      
      expect(pattern).toBeDefined();
      expect(pattern?.number).toBe(20);
      expect(pattern?.sound).toBe("エ");
      expect(pattern?.special).toBe(true);
      expect(pattern?.meaning).toContain("完全外発");
    });

    it("存在しない番号の場合undefinedを返す", async () => {
      const pattern = await getPatternByNumber(999);
      
      expect(pattern).toBeUndefined();
    });
  });

  describe("getAllPatterns", () => {
    it("50パターンすべてを取得できる", async () => {
      const patterns = await getAllPatterns();
      
      expect(patterns.length).toBe(50);
    });

    it("中心霊が含まれている", async () => {
      const patterns = await getAllPatterns();
      
      const specialPatterns = patterns.filter(p => p.special);
      expect(specialPatterns.length).toBe(2);
      
      const yai = specialPatterns.find(p => p.number === 18);
      const yae = specialPatterns.find(p => p.number === 20);
      
      expect(yai).toBeDefined();
      expect(yae).toBeDefined();
    });

    it("天津金木24相が含まれている", async () => {
      const patterns = await getAllPatterns();
      
      const patterns24 = patterns.filter(p => p.category === "天津金木24相");
      expect(patterns24.length).toBeGreaterThan(0);
    });

    it("陰陽反転相が含まれている", async () => {
      const patterns = await getAllPatterns();
      
      const patternsInYo = patterns.filter(p => p.category === "陰陽反転相");
      expect(patternsInYo.length).toBeGreaterThan(0);
    });
  });

  describe("getAllBasicMovements", () => {
    it("4つの基本動作を取得できる", async () => {
      const movements = await getAllBasicMovements();
      
      expect(movements.length).toBe(4);
    });

    it("左旋内集が含まれている", async () => {
      const movements = await getAllBasicMovements();
      
      const sasenNaishuu = movements.find(m => m.name === "左旋内集");
      expect(sasenNaishuu).toBeDefined();
      expect(sasenNaishuu?.reading).toBe("させんないしゅう");
    });

    it("右旋内集が含まれている", async () => {
      const movements = await getAllBasicMovements();
      
      const usenNaishuu = movements.find(m => m.name === "右旋内集");
      expect(usenNaishuu).toBeDefined();
      expect(usenNaishuu?.reading).toBe("うせんないしゅう");
    });

    it("左旋外発が含まれている", async () => {
      const movements = await getAllBasicMovements();
      
      const sasenGaihatsu = movements.find(m => m.name === "左旋外発");
      expect(sasenGaihatsu).toBeDefined();
      expect(sasenGaihatsu?.reading).toBe("させんがいはつ");
    });

    it("右旋外発が含まれている", async () => {
      const movements = await getAllBasicMovements();
      
      const usenGaihatsu = movements.find(m => m.name === "右旋外発");
      expect(usenGaihatsu).toBeDefined();
      expect(usenGaihatsu?.reading).toBe("うせんがいはつ");
    });
  });
});
