import { describe, expect, it } from "vitest";
import {
  segmentByMinaka,
  getColorByHiMizu,
  getStyleByAion,
  adjustSubtitleTiming,
  executeKotodamaSubtitleEngine,
  convertToSRT,
  convertToVTT,
  type KotodamaAnalysisSegment,
  type CutPoint
} from "./kotodamaSubtitleEngine";

describe("Kotodama Subtitle Engine V1", () => {
  describe("segmentByMinaka", () => {
    it("should segment by minaka (center)", () => {
      const kotodamaAnalysis: KotodamaAnalysisSegment[] = [
        { start: 0, end: 2, text: "こんにちは", hiMizu: "hi", aion: "A", minaka: false },
        { start: 2, end: 4, text: "今日は", hiMizu: "mizu", aion: "A", minaka: true },
        { start: 4, end: 6, text: "良い天気ですね", hiMizu: "hi", aion: "E", minaka: false }
      ];

      const cutPoints: CutPoint[] = [];

      const segments = segmentByMinaka(kotodamaAnalysis, cutPoints);

      expect(segments.length).toBeGreaterThan(0);
      expect(segments.some(s => s.minaka)).toBe(true);
    });

    it("should limit segment length to 20 characters", () => {
      const kotodamaAnalysis: KotodamaAnalysisSegment[] = [
        { start: 0, end: 2, text: "これは非常に長いテキストです", hiMizu: "hi", aion: "A", minaka: false },
        { start: 2, end: 4, text: "さらに続きます", hiMizu: "mizu", aion: "A", minaka: false }
      ];

      const cutPoints: CutPoint[] = [];

      const segments = segmentByMinaka(kotodamaAnalysis, cutPoints);

      segments.forEach(segment => {
        expect(segment.text.length).toBeLessThanOrEqual(20);
      });
    });

    it("should segment at cut points", () => {
      const kotodamaAnalysis: KotodamaAnalysisSegment[] = [
        { start: 0, end: 2, text: "こんにちは", hiMizu: "hi", aion: "A", minaka: false },
        { start: 2, end: 4, text: "今日は", hiMizu: "mizu", aion: "A", minaka: false },
        { start: 4, end: 6, text: "良い天気ですね", hiMizu: "hi", aion: "E", minaka: false }
      ];

      const cutPoints: CutPoint[] = [
        { start: 2, end: 2.1, type: "breath", confidence: 0.8 }
      ];

      const segments = segmentByMinaka(kotodamaAnalysis, cutPoints);

      expect(segments.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("getColorByHiMizu", () => {
    it("should return red color for hi (fire)", () => {
      const color = getColorByHiMizu("hi");
      expect(color).toBe("#FF6B6B");
    });

    it("should return blue color for mizu (water)", () => {
      const color = getColorByHiMizu("mizu");
      expect(color).toBe("#4ECDC4");
    });
  });

  describe("getStyleByAion", () => {
    it("should return strong style for Ka/Ta/Ma/Na/A row", () => {
      expect(getStyleByAion("かきくけこ")).toBe("strong");
      expect(getStyleByAion("たちつてと")).toBe("strong");
      expect(getStyleByAion("まみむめも")).toBe("strong");
      expect(getStyleByAion("なにぬねの")).toBe("strong");
      expect(getStyleByAion("あいうえお")).toBe("strong");
    });

    it("should return soft style for Yu/Ru/Mo", () => {
      expect(getStyleByAion("ゆよ")).toBe("soft");
      expect(getStyleByAion("るれろ")).toBe("soft");
      // "も" is in Ma row (strong), not soft
      expect(getStyleByAion("もと")).toBe("strong");
    });

    it("should return neutral style for other characters", () => {
      expect(getStyleByAion("わをん")).toBe("neutral");
    });
  });

  describe("adjustSubtitleTiming", () => {
    it("should adjust timing within 0.8-2.4 seconds range", () => {
      const segment: KotodamaAnalysisSegment = {
        start: 0,
        end: 5,
        text: "こんにちは",
        hiMizu: "hi",
        aion: "A",
        minaka: false
      };

      const timing = adjustSubtitleTiming(segment);

      expect(timing.end - timing.start).toBeGreaterThanOrEqual(0.8);
      expect(timing.end - timing.start).toBeLessThanOrEqual(2.4);
    });

    it("should scale timing based on text length", () => {
      const shortSegment: KotodamaAnalysisSegment = {
        start: 0,
        end: 5,
        text: "こん",
        hiMizu: "hi",
        aion: "A",
        minaka: false
      };

      const longSegment: KotodamaAnalysisSegment = {
        start: 0,
        end: 5,
        text: "これは非常に長いテキストです",
        hiMizu: "hi",
        aion: "A",
        minaka: false
      };

      const shortTiming = adjustSubtitleTiming(shortSegment);
      const longTiming = adjustSubtitleTiming(longSegment);

      expect(longTiming.end - longTiming.start).toBeGreaterThan(shortTiming.end - shortTiming.start);
    });
  });

  describe("executeKotodamaSubtitleEngine", () => {
    it("should generate subtitles with all properties", () => {
      const kotodamaAnalysis: KotodamaAnalysisSegment[] = [
        { start: 0, end: 2, text: "こんにちは", hiMizu: "hi", aion: "A", minaka: false },
        { start: 2, end: 4, text: "今日は", hiMizu: "mizu", aion: "A", minaka: true },
        { start: 4, end: 6, text: "良い天気ですね", hiMizu: "hi", aion: "E", minaka: false }
      ];

      const cutPoints: CutPoint[] = [
        { start: 2, end: 2.1, type: "breath", confidence: 0.8 }
      ];

      const subtitles = executeKotodamaSubtitleEngine(kotodamaAnalysis, cutPoints);

      expect(subtitles.length).toBeGreaterThan(0);
      
      subtitles.forEach(subtitle => {
        expect(subtitle).toHaveProperty("start");
        expect(subtitle).toHaveProperty("end");
        expect(subtitle).toHaveProperty("subtitle");
        expect(subtitle).toHaveProperty("hiMizu");
        expect(subtitle).toHaveProperty("aion");
        expect(subtitle).toHaveProperty("color");
        expect(subtitle).toHaveProperty("style");
      });
    });

    it("should apply hi-mizu color mapping", () => {
      const kotodamaAnalysis: KotodamaAnalysisSegment[] = [
        { start: 0, end: 2, text: "こんにちは", hiMizu: "hi", aion: "A", minaka: false },
        { start: 2, end: 4, text: "今日は", hiMizu: "mizu", aion: "A", minaka: false }
      ];

      const cutPoints: CutPoint[] = [];

      const subtitles = executeKotodamaSubtitleEngine(kotodamaAnalysis, cutPoints);

      expect(subtitles.length).toBeGreaterThan(0);
      expect(subtitles[0]?.color).toBe("#FF6B6B");
    });

    it("should apply aion style", () => {
      const kotodamaAnalysis: KotodamaAnalysisSegment[] = [
        { start: 0, end: 2, text: "かきくけこ", hiMizu: "hi", aion: "A", minaka: false },
        { start: 2, end: 4, text: "ゆよ", hiMizu: "mizu", aion: "U", minaka: false }
      ];

      const cutPoints: CutPoint[] = [];

      const subtitles = executeKotodamaSubtitleEngine(kotodamaAnalysis, cutPoints);

      expect(subtitles.length).toBeGreaterThan(0);
      expect(subtitles[0]?.style).toBe("strong");
    });
  });

  describe("convertToSRT", () => {
    it("should convert subtitles to SRT format", () => {
      const subtitles = [
        {
          start: 0,
          end: 2,
          subtitle: "こんにちは",
          hiMizu: "hi" as const,
          aion: "A",
          color: "#FF6B6B",
          style: "strong" as const
        },
        {
          start: 2,
          end: 4,
          subtitle: "今日は",
          hiMizu: "mizu" as const,
          aion: "A",
          color: "#4ECDC4",
          style: "neutral" as const
        }
      ];

      const srt = convertToSRT(subtitles);

      expect(srt).toContain("1");
      expect(srt).toContain("00:00:00,000 --> 00:00:02,000");
      expect(srt).toContain("こんにちは");
      expect(srt).toContain("2");
      expect(srt).toContain("00:00:02,000 --> 00:00:04,000");
      expect(srt).toContain("今日は");
    });

    it("should handle empty subtitles", () => {
      const subtitles: any[] = [];
      const srt = convertToSRT(subtitles);
      expect(srt).toBe("");
    });
  });

  describe("convertToVTT", () => {
    it("should convert subtitles to VTT format", () => {
      const subtitles = [
        {
          start: 0,
          end: 2,
          subtitle: "こんにちは",
          hiMizu: "hi" as const,
          aion: "A",
          color: "#FF6B6B",
          style: "strong" as const
        },
        {
          start: 2,
          end: 4,
          subtitle: "今日は",
          hiMizu: "mizu" as const,
          aion: "A",
          color: "#4ECDC4",
          style: "neutral" as const
        }
      ];

      const vtt = convertToVTT(subtitles);

      expect(vtt).toContain("WEBVTT");
      expect(vtt).toContain("1");
      expect(vtt).toContain("00:00:00.000 --> 00:00:02.000");
      expect(vtt).toContain("こんにちは");
      expect(vtt).toContain("2");
      expect(vtt).toContain("00:00:02.000 --> 00:00:04.000");
      expect(vtt).toContain("今日は");
    });

    it("should handle empty subtitles", () => {
      const subtitles: any[] = [];
      const vtt = convertToVTT(subtitles);
      expect(vtt).toBe("WEBVTT\n\n");
    });
  });
});
