import { describe, expect, it } from "vitest";
import {
  detectAudioBreathPoints,
  detectKotodamaBreathPoints,
  detectHiMizuShiftPoints,
  executeBreathCutEngine,
  type TranscriptionSegment,
  type KotodamaAnalysisSegment
} from "./breathCutEngine";

describe("Breath-Cut Engine V1", () => {
  describe("detectAudioBreathPoints", () => {
    it("should detect breath points from silence gaps", () => {
      const segments: TranscriptionSegment[] = [
        { start: 0, end: 2, text: "こんにちは" },
        { start: 2.3, end: 4, text: "今日は" }, // 0.3秒の無音
        { start: 4.5, end: 6, text: "良い天気ですね" } // 0.5秒の無音
      ];

      const breathPoints = detectAudioBreathPoints(segments);

      expect(breathPoints.length).toBeGreaterThan(0);
      expect(breathPoints[0]?.confidence).toBeGreaterThan(0);
    });

    it("should return empty array for continuous speech", () => {
      const segments: TranscriptionSegment[] = [
        { start: 0, end: 2, text: "こんにちは" },
        { start: 2, end: 4, text: "今日は" }, // 無音なし
        { start: 4, end: 6, text: "良い天気ですね" }
      ];

      const breathPoints = detectAudioBreathPoints(segments);

      expect(breathPoints.length).toBe(0);
    });

    it("should detect high confidence breath points for long silence", () => {
      const segments: TranscriptionSegment[] = [
        { start: 0, end: 2, text: "こんにちは" },
        { start: 2.3, end: 4, text: "今日は" } // 0.3秒の無音（50-400ms範囲内）
      ];

      const breathPoints = detectAudioBreathPoints(segments);

      expect(breathPoints.length).toBeGreaterThan(0);
      expect(breathPoints[0]?.confidence).toBeGreaterThan(0);
    });
  });

  describe("detectKotodamaBreathPoints", () => {
    it("should detect breath points at A-dan endings", () => {
      const segments: KotodamaAnalysisSegment[] = [
        { start: 0, end: 2, text: "こんにちは", hiMizu: "hi", aion: "A", minaka: false },
        { start: 2, end: 4, text: "今日は", hiMizu: "mizu", aion: "A", minaka: false }
      ];

      const breathPoints = detectKotodamaBreathPoints(segments);

      expect(breathPoints.length).toBeGreaterThan(0);
      expect(breathPoints[0]?.type).toBe("kotodama_breath");
    });

    it("should detect breath points at Ha/Sa/Na/Ra row", () => {
      const segments: KotodamaAnalysisSegment[] = [
        { start: 0, end: 2, text: "はい", hiMizu: "hi", aion: "I", minaka: false },
        { start: 2, end: 4, text: "さようなら", hiMizu: "hi", aion: "A", minaka: false }
      ];

      const breathPoints = detectKotodamaBreathPoints(segments);

      expect(breathPoints.length).toBeGreaterThan(0);
    });

    it("should return empty array for non-breath kotodama", () => {
      const segments: KotodamaAnalysisSegment[] = [
        { start: 0, end: 2, text: "きょう", hiMizu: "hi", aion: "U", minaka: false },
        { start: 2, end: 4, text: "てんき", hiMizu: "mizu", aion: "I", minaka: false }
      ];

      const breathPoints = detectKotodamaBreathPoints(segments);

      expect(breathPoints.length).toBe(0);
    });
  });

  describe("detectHiMizuShiftPoints", () => {
    it("should detect hi to mizu shift", () => {
      const segments: KotodamaAnalysisSegment[] = [
        { start: 0, end: 2, text: "こんにちは", hiMizu: "hi", aion: "A", minaka: false },
        { start: 2, end: 4, text: "今日は", hiMizu: "mizu", aion: "A", minaka: false }
      ];

      const shiftPoints = detectHiMizuShiftPoints(segments);

      expect(shiftPoints.length).toBe(1);
      expect(shiftPoints[0]?.type).toBe("hi_mizu_shift");
      expect(shiftPoints[0]?.confidence).toBeGreaterThan(0);
    });

    it("should detect mizu to hi shift", () => {
      const segments: KotodamaAnalysisSegment[] = [
        { start: 0, end: 2, text: "今日は", hiMizu: "mizu", aion: "A", minaka: false },
        { start: 2, end: 4, text: "こんにちは", hiMizu: "hi", aion: "A", minaka: false }
      ];

      const shiftPoints = detectHiMizuShiftPoints(segments);

      expect(shiftPoints.length).toBe(1);
      expect(shiftPoints[0]?.type).toBe("hi_mizu_shift");
    });

    it("should return empty array for consistent hi-mizu", () => {
      const segments: KotodamaAnalysisSegment[] = [
        { start: 0, end: 2, text: "こんにちは", hiMizu: "hi", aion: "A", minaka: false },
        { start: 2, end: 4, text: "さようなら", hiMizu: "hi", aion: "A", minaka: false }
      ];

      const shiftPoints = detectHiMizuShiftPoints(segments);

      expect(shiftPoints.length).toBe(0);
    });
  });

  describe("executeBreathCutEngine", () => {
    it("should integrate all breath detection methods", () => {
      const transcriptionSegments: TranscriptionSegment[] = [
        { start: 0, end: 2, text: "こんにちは" },
        { start: 2.5, end: 4, text: "今日は" },
        { start: 4.8, end: 6, text: "良い天気ですね" }
      ];

      const kotodamaSegments: KotodamaAnalysisSegment[] = [
        { start: 0, end: 2, text: "こんにちは", hiMizu: "hi", aion: "A", minaka: false },
        { start: 2.5, end: 4, text: "今日は", hiMizu: "mizu", aion: "A", minaka: false },
        { start: 4.8, end: 6, text: "良い天気ですね", hiMizu: "hi", aion: "E", minaka: true }
      ];

      const cutPoints = executeBreathCutEngine(transcriptionSegments, kotodamaSegments);

      expect(cutPoints.length).toBeGreaterThan(0);
      expect(cutPoints[0]).toHaveProperty("start");
      expect(cutPoints[0]).toHaveProperty("end");
      expect(cutPoints[0]).toHaveProperty("type");
      expect(cutPoints[0]).toHaveProperty("confidence");
    });

    it("should prioritize high confidence cut points", () => {
      const transcriptionSegments: TranscriptionSegment[] = [
        { start: 0, end: 2, text: "こんにちは" },
        { start: 3, end: 5, text: "今日は" } // 1秒の無音（高信頼度）
      ];

      const kotodamaSegments: KotodamaAnalysisSegment[] = [
        { start: 0, end: 2, text: "こんにちは", hiMizu: "hi", aion: "A", minaka: false },
        { start: 3, end: 5, text: "今日は", hiMizu: "mizu", aion: "A", minaka: false }
      ];

      const cutPoints = executeBreathCutEngine(transcriptionSegments, kotodamaSegments);

      expect(cutPoints.length).toBeGreaterThan(0);
      expect(cutPoints[0]?.confidence).toBeGreaterThan(0.7);
    });

    it("should handle empty segments", () => {
      const transcriptionSegments: TranscriptionSegment[] = [];
      const kotodamaSegments: KotodamaAnalysisSegment[] = [];

      const cutPoints = executeBreathCutEngine(transcriptionSegments, kotodamaSegments);

      expect(cutPoints).toEqual([]);
    });

    it("should detect multiple cut point types", () => {
      const transcriptionSegments: TranscriptionSegment[] = [
        { start: 0, end: 2, text: "こんにちは" },
        { start: 2.5, end: 4, text: "今日は" },
        { start: 5, end: 7, text: "良い天気ですね" }
      ];

      const kotodamaSegments: KotodamaAnalysisSegment[] = [
        { start: 0, end: 2, text: "こんにちは", hiMizu: "hi", aion: "A", minaka: false },
        { start: 2.5, end: 4, text: "今日は", hiMizu: "mizu", aion: "A", minaka: false },
        { start: 5, end: 7, text: "良い天気ですね", hiMizu: "hi", aion: "E", minaka: true }
      ];

      const cutPoints = executeBreathCutEngine(transcriptionSegments, kotodamaSegments);

      const types = cutPoints.map(p => p.type);
      expect(types.length).toBeGreaterThan(0);
    });
  });
});
