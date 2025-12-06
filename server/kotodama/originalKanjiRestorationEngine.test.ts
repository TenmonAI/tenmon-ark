import { describe, expect, it } from "vitest";
import {
  restoreOriginalKanji,
  detectContextType,
  autoRestoreOriginalKanji,
  formatRestorationDiff,
  getRestorableKanji,
  CONTEXT_PRIORITY_THRESHOLDS,
  type ContextType,
} from "./originalKanjiRestorationEngine";

describe("OKRE (Original Kanji Restoration Engine)", () => {
  describe("restoreOriginalKanji", () => {
    it("should restore modern kanji to old kanji in spiritual context", () => {
      const text = "気持ちを大切にする靈的な学び";
      const result = restoreOriginalKanji(text, { contextType: "spiritual" });
      
      expect(result.restored).toBe("氣持ちを大切にする靈的な學び");
      expect(result.stats.restoredCount).toBeGreaterThan(0);
    });

    it("should preserve modern kanji in preserveModern list", () => {
      const text = "気持ちを大切にする";
      const result = restoreOriginalKanji(text, {
        contextType: "spiritual",
        preserveModern: ["気"],
      });
      
      expect(result.restored).toBe("気持ちを大切にする");
    });

    it("should force restore kanji in forceRestore list", () => {
      const text = "続く";
      const result = restoreOriginalKanji(text, {
        contextType: "modern", // Normally wouldn't restore
        forceRestore: ["続"],
      });
      
      expect(result.restored).toBe("續く");
    });

    it("should record all changes", () => {
      const text = "気持ち";
      const result = restoreOriginalKanji(text, { contextType: "spiritual" });
      
      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.changes[0]?.from).toBe("気");
      expect(result.changes[0]?.to).toBe("氣");
    });

    it("should calculate restoration rate", () => {
      const text = "気";
      const result = restoreOriginalKanji(text, { contextType: "spiritual" });
      
      expect(result.stats.restorationRate).toBeGreaterThan(0);
      expect(result.stats.restorationRate).toBeLessThanOrEqual(1);
    });

    it("should calculate spiritual score", () => {
      const text = "気靈";
      const result = restoreOriginalKanji(text, { contextType: "spiritual" });
      
      expect(result.stats.spiritualScore).toBeGreaterThan(0);
    });

    it("should respect context priority threshold", () => {
      const text = "続く"; // 續 has priority 60
      const resultCasual = restoreOriginalKanji(text, { contextType: "casual" }); // threshold 90
      const resultSpiritual = restoreOriginalKanji(text, { contextType: "spiritual" }); // threshold 0
      
      expect(resultCasual.restored).toBe("続く"); // Not restored
      expect(resultSpiritual.restored).toBe("續く"); // Restored
    });

    it("should handle empty text", () => {
      const text = "";
      const result = restoreOriginalKanji(text, { contextType: "spiritual" });
      
      expect(result.restored).toBe("");
      expect(result.stats.restoredCount).toBe(0);
    });

    it("should handle text with no restorable kanji", () => {
      const text = "ひらがなだけのテキスト";
      const result = restoreOriginalKanji(text, { contextType: "spiritual" });
      
      expect(result.restored).toBe(text);
      expect(result.stats.restoredCount).toBe(0);
    });

    it("should sort changes by position", () => {
      const text = "気持ちの学び";
      const result = restoreOriginalKanji(text, { contextType: "spiritual" });
      
      for (let i = 1; i < result.changes.length; i++) {
        expect(result.changes[i]!.position).toBeGreaterThanOrEqual(result.changes[i - 1]!.position);
      }
    });
  });

  describe("detectContextType", () => {
    it("should detect spiritual context", () => {
      const text = "靈的な学びを通じて魂を磨く";
      const contextType = detectContextType(text);
      
      expect(contextType).toBe("spiritual");
    });

    it("should detect academic context", () => {
      const text = "本研究では、理論的な分析を行う";
      const contextType = detectContextType(text);
      
      expect(contextType).toBe("academic");
    });

    it("should detect formal context", () => {
      const text = "拝啓 貴社ますますご清栄のこととお慶び申し上げます";
      const contextType = detectContextType(text);
      
      expect(contextType).toBe("formal");
    });

    it("should detect casual context for ordinary text", () => {
      const text = "今日はいい天気ですね";
      const contextType = detectContextType(text);
      
      expect(contextType).toBe("casual");
    });

    it("should prioritize spiritual over academic", () => {
      const text = "靈的な研究を行う";
      const contextType = detectContextType(text);
      
      expect(contextType).toBe("spiritual");
    });
  });

  describe("autoRestoreOriginalKanji", () => {
    it("should auto-detect and restore spiritual text", () => {
      const text = "靈的な学びで気を高める";
      const result = autoRestoreOriginalKanji(text);
      
      expect(result.restored).toContain("靈");
      expect(result.restored).toContain("學");
      expect(result.restored).toContain("氣");
    });

    it("should auto-detect and restore academic text", () => {
      const text = "研究により学説を検証する";
      const result = autoRestoreOriginalKanji(text);
      
      expect(result.restored).toContain("學");
    });

    it("should handle preserveModern option", () => {
      const text = "靈的な気持ち";
      const result = autoRestoreOriginalKanji(text, { preserveModern: ["気"] });
      
      expect(result.restored).toContain("靈");
      expect(result.restored).toContain("気"); // Not restored
    });
  });

  describe("formatRestorationDiff", () => {
    it("should format restoration result", () => {
      const text = "気持ち";
      const result = restoreOriginalKanji(text, { contextType: "spiritual" });
      const formatted = formatRestorationDiff(result);
      
      expect(formatted).toContain("復元数");
      expect(formatted).toContain("復元率");
      expect(formatted).toContain("靈性スコア");
    });

    it("should show no changes message", () => {
      const text = "ひらがな";
      const result = restoreOriginalKanji(text, { contextType: "spiritual" });
      const formatted = formatRestorationDiff(result);
      
      expect(formatted).toBe("変更なし");
    });

    it("should list all changes", () => {
      const text = "気靈";
      const result = restoreOriginalKanji(text, { contextType: "spiritual" });
      const formatted = formatRestorationDiff(result);
      
      expect(formatted).toContain("気 → 氣");
      expect(formatted).toContain("靈 → 靈");
    });
  });

  describe("getRestorableKanji", () => {
    it("should return restorable kanji in text", () => {
      const text = "気持ちを大切にする靈的な学び";
      const restorable = getRestorableKanji(text, "spiritual");
      
      expect(restorable.length).toBeGreaterThan(0);
      expect(restorable.some(k => k.modern === "気")).toBe(true);
      expect(restorable.some(k => k.modern === "靈")).toBe(true);
      expect(restorable.some(k => k.modern === "学")).toBe(true);
    });

    it("should sort by priority descending", () => {
      const text = "気学国";
      const restorable = getRestorableKanji(text, "spiritual");
      
      for (let i = 1; i < restorable.length; i++) {
        expect(restorable[i]!.priority).toBeLessThanOrEqual(restorable[i - 1]!.priority);
      }
    });

    it("should count occurrences", () => {
      const text = "気気気";
      const restorable = getRestorableKanji(text, "spiritual");
      
      const kiEntry = restorable.find(k => k.modern === "気");
      expect(kiEntry?.count).toBe(3);
    });

    it("should respect context threshold", () => {
      const text = "続く"; // 續 has priority 60
      const restorableCasual = getRestorableKanji(text, "casual"); // threshold 90
      const restorableSpiritual = getRestorableKanji(text, "spiritual"); // threshold 0
      
      expect(restorableCasual.length).toBe(0);
      expect(restorableSpiritual.length).toBeGreaterThan(0);
    });

    it("should return empty array for text with no restorable kanji", () => {
      const text = "ひらがなだけ";
      const restorable = getRestorableKanji(text, "spiritual");
      
      expect(restorable.length).toBe(0);
    });
  });

  describe("CONTEXT_PRIORITY_THRESHOLDS", () => {
    it("should have correct thresholds", () => {
      expect(CONTEXT_PRIORITY_THRESHOLDS.spiritual).toBe(0);
      expect(CONTEXT_PRIORITY_THRESHOLDS.academic).toBe(70);
      expect(CONTEXT_PRIORITY_THRESHOLDS.formal).toBe(80);
      expect(CONTEXT_PRIORITY_THRESHOLDS.casual).toBe(90);
      expect(CONTEXT_PRIORITY_THRESHOLDS.modern).toBe(1000);
    });

    it("should have thresholds in ascending order", () => {
      expect(CONTEXT_PRIORITY_THRESHOLDS.spiritual).toBeLessThan(CONTEXT_PRIORITY_THRESHOLDS.academic);
      expect(CONTEXT_PRIORITY_THRESHOLDS.academic).toBeLessThan(CONTEXT_PRIORITY_THRESHOLDS.formal);
      expect(CONTEXT_PRIORITY_THRESHOLDS.formal).toBeLessThan(CONTEXT_PRIORITY_THRESHOLDS.casual);
      expect(CONTEXT_PRIORITY_THRESHOLDS.casual).toBeLessThan(CONTEXT_PRIORITY_THRESHOLDS.modern);
    });
  });
});
