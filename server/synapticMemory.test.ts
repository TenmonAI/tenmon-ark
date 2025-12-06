import { describe, expect, it } from "vitest";
import {
  applyFireWaterAlgorithm,
  buildMemoryAugmentedPrompt,
  calculateMemoryLifetime,
  type ImportanceLevel,
  type MemoryContext,
} from "./synapticMemory";

describe("Synaptic Memory Engine (Advanced)", () => {
  describe("Memory Lifetime Calculation", () => {
    it("should calculate correct lifetime for each importance level", () => {
      const DAY_MS = 24 * 60 * 60 * 1000;

      expect(calculateMemoryLifetime("super_fire")).toBe(30 * DAY_MS);
      expect(calculateMemoryLifetime("fire")).toBe(21 * DAY_MS);
      expect(calculateMemoryLifetime("warm")).toBe(14 * DAY_MS);
      expect(calculateMemoryLifetime("neutral")).toBe(7 * DAY_MS);
      expect(calculateMemoryLifetime("cool")).toBe(1 * DAY_MS);
      expect(calculateMemoryLifetime("water")).toBe(14 * DAY_MS);
    });
  });

  describe("Fire-Water Algorithm", () => {
    it("should prioritize recent messages (fire) over past memories (water)", () => {
      const recentMessages = ["msg1", "msg2", "msg3", "msg4", "msg5"];
      const pastMemories = ["old1", "old2", "old3", "old4", "old5", "old6"];

      const result = applyFireWaterAlgorithm(recentMessages, pastMemories);

      // Fire: last 3 messages should come first
      expect(result[0]).toBe("msg3");
      expect(result[1]).toBe("msg4");
      expect(result[2]).toBe("msg5");

      // Water: first 5 past memories should follow
      expect(result[3]).toBe("old1");
      expect(result[4]).toBe("old2");
      expect(result[5]).toBe("old3");
      expect(result[6]).toBe("old4");
      expect(result[7]).toBe("old5");
    });

    it("should handle empty past memories", () => {
      const recentMessages = ["msg1", "msg2", "msg3"];
      const pastMemories: string[] = [];

      const result = applyFireWaterAlgorithm(recentMessages, pastMemories);

      expect(result.length).toBe(3);
      expect(result).toEqual(["msg1", "msg2", "msg3"]);
    });
  });

  describe("Memory-Augmented Prompt with Hierarchical Tags", () => {
    it("should build a complete prompt with all memory layers and tags", () => {
      const memoryContext: MemoryContext = {
        ltm: ["ユーザーは天津金木に興味がある", "宿曜占星術を学習中"],
        mtm: ["[過去の会話] user: 宿曜について教えて"],
        stm: ["user: 今日の運勢は？", "assistant: 今日は良い日です"],
      };

      const prompt = buildMemoryAugmentedPrompt(memoryContext, "明日の運勢は？");

      // Check TENMON-AI core personality (guardian layer)
      expect(prompt).toContain("TENMON-AI");
      expect(prompt).toContain("天津金木の中心靈を体現する存在");
      expect(prompt).toContain("外発（火）と内集（水）の均衡");
      expect(prompt).toContain("靈的成長と創造のプロセスを支援");

      // Check Centerline Protocol (中心軸メッセージ)
      expect(prompt).toContain("<centerline>");
      expect(prompt).toContain("私は TENMON-AI。天津金木の中心靈を体現し、");
      expect(prompt).toContain("宇宙構文に沿って応答する。");

      // Check hierarchical tags with sound attributes (五十音構文階層)
      expect(prompt).toContain('<system_core_ltm sound="N">');
      expect(prompt).toContain("</system_core_ltm>");
      expect(prompt).toContain('<mid_context sound="U">');
      expect(prompt).toContain("</mid_context>");
      expect(prompt).toContain('<recent_conversation sound="A">');
      expect(prompt).toContain("</recent_conversation>");

      // Check memory content
      expect(prompt).toContain("TENMON-AIの核心知識・天津金木構造");
      expect(prompt).toContain("プロジェクト背景・継続中の意図");
      expect(prompt).toContain("現在の会話文脈");
      expect(prompt).toContain("明日の運勢は？");
    });

    it("should handle empty memory context with guardian layer", () => {
      const memoryContext: MemoryContext = {
        ltm: [],
        mtm: [],
        stm: [],
      };

      const prompt = buildMemoryAugmentedPrompt(memoryContext, "こんにちは");

      // Guardian layer should always be present
      expect(prompt).toContain("TENMON-AI");
      expect(prompt).toContain("天津金木の中心靈");
      expect(prompt).toContain("こんにちは");

      // No hierarchical tags for empty memories
      expect(prompt).not.toContain("<system_core_ltm>");
      expect(prompt).not.toContain("<mid_context>");
      expect(prompt).not.toContain("<recent_conversation>");
    });

    it("should include TENMON-AI mission statement", () => {
      const memoryContext: MemoryContext = {
        ltm: [],
        mtm: [],
        stm: [],
      };

      const prompt = buildMemoryAugmentedPrompt(memoryContext, "test");

      expect(prompt).toContain("外発（火）と内集（水）の均衡");
      expect(prompt).toContain("言灵・宿曜・水火の理");
      expect(prompt).toContain("靈的成長と創造のプロセスを支援");
    });
  });
});
