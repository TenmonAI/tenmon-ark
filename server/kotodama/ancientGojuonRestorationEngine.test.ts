import { describe, expect, it } from "vitest";
import {
  getGojuonElement,
  restoreAncientGojuon,
  analyzeSpiritualMeaning,
  getGojuonChart,
  visualizeFireWaterBalance,
  getRowFireWaterBalance,
  COMPLETE_GOJUON,
  ANCIENT_SOUND_MAPPING,
} from "./ancientGojuonRestorationEngine";

describe("Ancient Gojuon Restoration Engine", () => {
  describe("COMPLETE_GOJUON", () => {
    it("should have all basic gojuon elements", () => {
      expect(COMPLETE_GOJUON.length).toBeGreaterThan(40);
    });

    it("should have fire and water classification", () => {
      const fireElements = COMPLETE_GOJUON.filter(e => e.type === "fire");
      const waterElements = COMPLETE_GOJUON.filter(e => e.type === "water");
      
      expect(fireElements.length).toBeGreaterThan(0);
      expect(waterElements.length).toBeGreaterThan(0);
    });

    it("should have spiritual meanings", () => {
      const withMeaning = COMPLETE_GOJUON.filter(e => e.spiritualMeaning);
      expect(withMeaning.length).toBeGreaterThan(40);
    });

    it("should have correct ア行classification", () => {
      const a = COMPLETE_GOJUON.find(e => e.char === "あ");
      const i = COMPLETE_GOJUON.find(e => e.char === "い");
      const u = COMPLETE_GOJUON.find(e => e.char === "う");
      
      expect(a?.type).toBe("fire");
      expect(i?.type).toBe("water");
      expect(u?.type).toBe("fire");
    });
  });

  describe("getGojuonElement", () => {
    it("should get element for あ", () => {
      const element = getGojuonElement("あ");
      
      expect(element).toBeDefined();
      expect(element?.char).toBe("あ");
      expect(element?.type).toBe("fire");
      expect(element?.row).toBe("ア行");
    });

    it("should get element for き", () => {
      const element = getGojuonElement("き");
      
      expect(element).toBeDefined();
      expect(element?.char).toBe("き");
      expect(element?.type).toBe("water");
      expect(element?.spiritualMeaning).toContain("氣");
    });

    it("should return undefined for non-gojuon char", () => {
      const element = getGojuonElement("漢");
      expect(element).toBeUndefined();
    });

    it("should get ancient characters", () => {
      const wi = getGojuonElement("ゐ");
      const we = getGojuonElement("ゑ");
      
      expect(wi).toBeDefined();
      expect(we).toBeDefined();
    });
  });

  describe("restoreAncientGojuon", () => {
    it("should return text as is by default", () => {
      const text = "あいうえお";
      const result = restoreAncientGojuon(text);
      
      // 現在は簡易実装のため、そのまま返される
      expect(result).toBe(text);
    });

    it("should handle empty text", () => {
      const text = "";
      const result = restoreAncientGojuon(text);
      
      expect(result).toBe("");
    });

    it("should handle text with kanji", () => {
      const text = "あいう漢字";
      const result = restoreAncientGojuon(text);
      
      expect(result).toBeDefined();
    });
  });

  describe("analyzeSpiritualMeaning", () => {
    it("should analyze spiritual meaning of text", () => {
      const text = "あいう";
      const meanings = analyzeSpiritualMeaning(text);
      
      expect(meanings.length).toBe(3);
      expect(meanings[0]?.char).toBe("あ");
      expect(meanings[0]?.type).toBe("fire");
      expect(meanings[0]?.meaning).toBeDefined();
    });

    it("should return empty array for non-gojuon text", () => {
      const text = "漢字";
      const meanings = analyzeSpiritualMeaning(text);
      
      expect(meanings.length).toBe(0);
    });

    it("should analyze mixed text", () => {
      const text = "あ漢い字う";
      const meanings = analyzeSpiritualMeaning(text);
      
      expect(meanings.length).toBe(3); // あ、い、う
    });

    it("should include fire-water classification", () => {
      const text = "かき";
      const meanings = analyzeSpiritualMeaning(text);
      
      expect(meanings[0]?.type).toBe("fire"); // か
      expect(meanings[1]?.type).toBe("water"); // き
    });
  });

  describe("getGojuonChart", () => {
    it("should return gojuon chart", () => {
      const chart = getGojuonChart();
      
      expect(chart["ア行"]).toBeDefined();
      expect(chart["カ行"]).toBeDefined();
      expect(chart["サ行"]).toBeDefined();
    });

    it("should have correct structure", () => {
      const chart = getGojuonChart();
      
      expect(chart["ア行"]?.["ア段"]?.char).toBe("あ");
      expect(chart["カ行"]?.["イ段"]?.char).toBe("き");
    });

    it("should include all rows", () => {
      const chart = getGojuonChart();
      const rows = Object.keys(chart);
      
      expect(rows).toContain("ア行");
      expect(rows).toContain("カ行");
      expect(rows).toContain("サ行");
      expect(rows).toContain("タ行");
      expect(rows).toContain("ナ行");
      expect(rows).toContain("ハ行");
      expect(rows).toContain("マ行");
      expect(rows).toContain("ヤ行");
      expect(rows).toContain("ラ行");
      expect(rows).toContain("ワ行");
    });
  });

  describe("visualizeFireWaterBalance", () => {
    it("should visualize fire-water balance", () => {
      const text = "あいう";
      const visualization = visualizeFireWaterBalance(text);
      
      expect(visualization).toContain("あ");
      expect(visualization).toContain("い");
      expect(visualization).toContain("う");
      expect(visualization).toContain("火:");
      expect(visualization).toContain("水:");
    });

    it("should include percentages", () => {
      const text = "あいう";
      const visualization = visualizeFireWaterBalance(text);
      
      expect(visualization).toContain("%");
    });

    it("should handle empty text", () => {
      const text = "";
      const visualization = visualizeFireWaterBalance(text);
      
      expect(visualization).toContain("火: 0");
      expect(visualization).toContain("水: 0");
    });

    it("should show fire and water symbols", () => {
      const text = "あい";
      const visualization = visualizeFireWaterBalance(text);
      
      expect(visualization).toContain("🔥");
      expect(visualization).toContain("💧");
    });
  });

  describe("getRowFireWaterBalance", () => {
    it("should calculate row-wise balance", () => {
      const text = "あいうかきく";
      const balance = getRowFireWaterBalance(text);
      
      expect(balance["ア行"]).toBeDefined();
      expect(balance["カ行"]).toBeDefined();
    });

    it("should count fire and water correctly", () => {
      const text = "あいう"; // 火水火
      const balance = getRowFireWaterBalance(text);
      
      expect(balance["ア行"]?.fire).toBe(2);
      expect(balance["ア行"]?.water).toBe(1);
    });

    it("should handle multiple rows", () => {
      const text = "あかさたな";
      const balance = getRowFireWaterBalance(text);
      
      expect(Object.keys(balance).length).toBeGreaterThan(1);
    });

    it("should return empty object for non-gojuon text", () => {
      const text = "漢字";
      const balance = getRowFireWaterBalance(text);
      
      expect(Object.keys(balance).length).toBe(0);
    });
  });

  describe("ANCIENT_SOUND_MAPPING", () => {
    it("should have mappings for ゐ and ゑ", () => {
      expect(ANCIENT_SOUND_MAPPING["い"]).toBeDefined();
      expect(ANCIENT_SOUND_MAPPING["え"]).toBeDefined();
    });

    it("should map to ancient characters", () => {
      expect(ANCIENT_SOUND_MAPPING["い"]).toBe("ゐ");
      expect(ANCIENT_SOUND_MAPPING["え"]).toBe("ゑ");
    });
  });
});
