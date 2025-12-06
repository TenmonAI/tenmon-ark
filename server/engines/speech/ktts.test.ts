/**
 * KTTS Engine Test Suite
 * Kotodama Text-to-Speech Engine テスト
 */

import { describe, expect, it } from "vitest";
import {
  convertToKotodamaTTS,
  calculateFireWaterVoiceParams,
  analyzeJapaneseProsody,
  synthesizeKotodamaSpeech,
} from "./kttsEngine";
import {
  generateFireWaterVoiceParams,
  emotionToFireWater,
  timeToFireWater,
  contextToFireWater,
  calculateComprehensiveFireWater,
} from "./fireWaterVoiceEngine";
import {
  convertTextToKotodama,
  calculateTextFireWater,
  getCategoryStatistics,
} from "./kotodamaTTSDictionary";
import {
  detectBreathPoints,
  calculatePauseDuration,
  generateIntonationPattern,
  detectSentenceType,
  detectEndingStyle,
} from "./japaneseProsodyEngine";
import {
  soulProfileToFireWater,
  determineVoiceAdjustmentMode,
  adjustmentModeToFireWater,
  calculateIntegratedFireWater,
} from "./soulVoiceIntegration";

describe("KTTS Engine Tests", () => {
  // ===== 1. 言灵TTS変換テスト =====
  describe("言灵TTS変換", () => {
    it("言霊→言灵の変換が正しく行われる", () => {
      const result = convertToKotodamaTTS("言霊の力");
      expect(result.kotodamaText).toContain("言灵");
    });

    it("霊→靈の変換が正しく行われる", () => {
      const result = convertToKotodamaTTS("霊魂");
      expect(result.kotodamaText).toContain("靈");
    });

    it("気→氣の変換が正しく行われる", () => {
      const result = convertToKotodamaTTS("元気");
      expect(result.kotodamaText).toContain("氣");
    });

    it("複数の変換が同時に行われる", () => {
      const result = convertTextToKotodama("言霊と霊魂と元気");
      expect(result.kotodamaText).toContain("言灵");
      expect(result.kotodamaText).toContain("靈");
      expect(result.kotodamaText).toContain("氣");
      expect(result.conversions.length).toBeGreaterThan(0);
    });
  });

  // ===== 2. 火水ボイスパラメータテスト =====
  describe("火水ボイスパラメータ", () => {
    it("火が強い場合、ピッチが高くなる", () => {
      const params = generateFireWaterVoiceParams(80, 20);
      expect(params.pitch).toBeGreaterThan(1.0);
      expect(params.voiceQuality).toBe("sharp");
    });

    it("水が強い場合、ピッチが低くなる", () => {
      const params = generateFireWaterVoiceParams(20, 80);
      expect(params.pitch).toBeLessThan(1.0);
      expect(params.voiceQuality).toBe("soft");
    });

    it("バランスが取れている場合、中庸のパラメータになる", () => {
      const params = generateFireWaterVoiceParams(50, 50);
      expect(params.pitch).toBeCloseTo(1.0, 1);
      expect(params.voiceQuality).toBe("balanced");
    });

    it("感情から火水バランスが正しく計算される", () => {
      const joyBalance = emotionToFireWater("joy");
      expect(joyBalance.fire).toBeGreaterThan(joyBalance.water);

      const sadnessBalance = emotionToFireWater("sadness");
      expect(sadnessBalance.water).toBeGreaterThan(sadnessBalance.fire);
    });

    it("時間帯から火水バランスが正しく計算される", () => {
      const morningBalance = timeToFireWater(9); // 朝
      expect(morningBalance.fire).toBeGreaterThan(morningBalance.water);

      const nightBalance = timeToFireWater(23); // 夜
      expect(nightBalance.water).toBeGreaterThan(nightBalance.fire);
    });

    it("文脈から火水バランスが正しく計算される", () => {
      const urgentBalance = contextToFireWater("urgent");
      expect(urgentBalance.fire).toBeGreaterThan(urgentBalance.water);

      const gentleBalance = contextToFireWater("gentle");
      expect(gentleBalance.water).toBeGreaterThan(gentleBalance.fire);
    });

    it("総合的な火水バランス計算が正しく動作する", () => {
      const balance = calculateComprehensiveFireWater({
        emotion: "joy",
        time: 9,
        context: "casual",
      });
      expect(balance.fire).toBeGreaterThan(0);
      expect(balance.water).toBeGreaterThan(0);
      expect(balance.fire + balance.water).toBeGreaterThan(0);
    });
  });

  // ===== 3. 日本語韻律解析テスト =====
  describe("日本語韻律解析", () => {
    it("息継ぎポイントが正しく検出される", () => {
      const text = "こんにちは、今日はいい天気ですね。";
      const breathPoints = detectBreathPoints(text);
      expect(breathPoints.length).toBeGreaterThan(0);
      expect(breathPoints).toContain(text.indexOf("、"));
      expect(breathPoints).toContain(text.indexOf("。"));
    });

    it("間の長さが火水バランスに応じて調整される", () => {
      const firePause = calculatePauseDuration("、", 50); // 火が強い
      const waterPause = calculatePauseDuration("、", -50); // 水が強い
      expect(firePause).toBeLessThan(waterPause);
    });

    it("抑揚パターンが正しく生成される", () => {
      const text = "こんにちは";
      const pattern = generateIntonationPattern(text, "statement");
      expect(pattern.length).toBeGreaterThan(0);
      expect(pattern[0].position).toBe(0); // 文頭
    });

    it("文の種類が正しく判定される", () => {
      expect(detectSentenceType("これは質問ですか？")).toBe("question");
      expect(detectSentenceType("すごい！")).toBe("exclamation");
      expect(detectSentenceType("これは文です。")).toBe("statement");
    });

    it("語尾スタイルが火水バランスから判定される", () => {
      expect(detectEndingStyle("そうだ", 50)).toBe("fire");
      expect(detectEndingStyle("そうですね", -50)).toBe("water");
      expect(detectEndingStyle("そうだね", 0)).toBe("neutral");
    });
  });

  // ===== 4. Soul Sync音声統合テスト =====
  describe("Soul Sync音声統合", () => {
    it("魂プロファイルから火水バランスが計算される", () => {
      const profile = {
        userId: 1,
        fireEnergy: 70,
        waterEnergy: 30,
        yangEnergy: 60,
        yinEnergy: 40,
        intuition: 80,
        logic: 50,
        empathy: 60,
        creativity: 75,
        positivity: 0.7,
        rationality: 0.6,
      };

      const balance = soulProfileToFireWater(profile);
      expect(balance.fire).toBeGreaterThan(balance.water);
    });

    it("感情状態から音声調整モードが判定される", () => {
      const stressedState = {
        currentEmotion: "anxiety" as const,
        intensity: 0.8,
        stressLevel: 80,
        energyLevel: 30,
      };

      const mode = determineVoiceAdjustmentMode(stressedState);
      expect(mode).toBe("calm_down");
    });

    it("音声調整モードから火水バランスが計算される", () => {
      const calmBalance = adjustmentModeToFireWater("calm_down");
      expect(calmBalance.water).toBeGreaterThan(calmBalance.fire);

      const encourageBalance = adjustmentModeToFireWater("encourage");
      expect(encourageBalance.fire).toBeGreaterThan(encourageBalance.water);
    });

    it("統合的な火水バランス計算が正しく動作する", () => {
      const profile = {
        userId: 1,
        fireEnergy: 60,
        waterEnergy: 40,
        yangEnergy: 55,
        yinEnergy: 45,
        intuition: 70,
        logic: 60,
        empathy: 65,
        creativity: 70,
        positivity: 0.65,
        rationality: 0.60,
      };

      const emotionalState = {
        currentEmotion: "neutral" as const,
        intensity: 0.5,
        stressLevel: 30,
        energyLevel: 70,
      };

      const balance = calculateIntegratedFireWater(profile, emotionalState);
      expect(balance.fire).toBeGreaterThan(0);
      expect(balance.water).toBeGreaterThan(0);
    });
  });

  // ===== 5. 音声合成統合テスト =====
  describe("音声合成統合", () => {
    it("音声合成が正常に完了する", async () => {
      const result = await synthesizeKotodamaSpeech("こんにちは", 1, {
        emotionalMode: "neutral",
      });

      expect(result.audioDataUrl).toBeDefined();
      expect(result.format).toBe("wav");
      expect(result.voiceParams).toBeDefined();
      expect(result.kotodamaConversion).toBeDefined();
      expect(result.prosody).toBeDefined();
      expect(result.synthesisTime).toBeGreaterThan(0);
    });

    it("感情モードが音声パラメータに反映される", async () => {
      const calmResult = await synthesizeKotodamaSpeech("落ち着いてください", 1, {
        emotionalMode: "calm",
      });

      const encourageResult = await synthesizeKotodamaSpeech("頑張ってください", 1, {
        emotionalMode: "encourage",
      });

      expect(calmResult.voiceParams).toBeDefined();
      expect(encourageResult.voiceParams).toBeDefined();
    });

    it("火水バランスの強制指定が正しく動作する", async () => {
      const result = await synthesizeKotodamaSpeech("テスト", 1, {
        forceFireWaterBalance: 50,
      });

      expect(result.voiceParams).toBeDefined();
    });
  });
});
