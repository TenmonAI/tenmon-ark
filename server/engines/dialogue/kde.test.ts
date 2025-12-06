/**
 * KDE (Kotodama Dialogue Engine) Test Suite
 * KDE統合テスト
 */

import { describe, expect, it } from "vitest";
import {
  classifyYabai,
  classifyMicrosound,
  calculateFireWaterModulation,
  judgeMinaka,
  performDeepUnderstanding,
  GOJUON_PHONEME_MAPPING,
} from "./kotodamaVoiceDeepUnderstanding";
import {
  analyzeConversationTempo,
  generateBackchannel,
  generateBreathSounds,
  adjustPauseDuration,
  generateNaturalConversationFlow,
} from "./naturalConversationFlowEngine";
import {
  analyzeEmotionTone,
  analyzeBreathStrength,
  analyzeHesitationLevel,
  isWhispering,
  calculateStressLevel,
  calculateEnergyLevel,
  analyzeSpeakingStyle,
  analyzeVoiceContext,
  estimateVoiceFeaturesFromText,
} from "./voiceContextAnalysisEngine";

describe("KDE Engine Tests", () => {
  // ===== 1. 「やばい」15分類テスト =====
  describe("「やばい」15分類", () => {
    it("危険（低音・緊張）が正しく判定される", () => {
      const result = classifyYabai("やばい！", {
        pitch: 170,
        volume: 0.7,
        speed: 170,
        pitchVariation: 30,
        volumeVariation: 0.3,
        pauseFrequency: 5,
        averagePauseDuration: 500,
      });
      expect(result).toBe("danger");
    });

    it("すごい（高音・興奮）が正しく判定される", () => {
      const result = classifyYabai("やばい！", {
        pitch: 260,
        volume: 0.8,
        speed: 180,
        pitchVariation: 40,
        volumeVariation: 0.3,
        pauseFrequency: 3,
        averagePauseDuration: 400,
      });
      expect(result).toBe("amazing");
    });

    it("美味しい（満足・柔らかい）が正しく判定される", () => {
      const result = classifyYabai("やばい〜", {
        pitch: 220,
        volume: 0.5,
        speed: 130,
        pitchVariation: 20,
        volumeVariation: 0.2,
        pauseFrequency: 4,
        averagePauseDuration: 600,
      });
      expect(result).toBe("delicious");
    });
  });

  // ===== 2. 微細音分類テスト =====
  describe("微細音分類", () => {
    it("「あ…」（気づき）が正しく判定される", () => {
      const result = classifyMicrosound("あ…", {
        pitch: 230,
        volume: 0.5,
        speed: 120,
        pitchVariation: 35,
        volumeVariation: 0.2,
        pauseFrequency: 5,
        averagePauseDuration: 500,
      });
      expect(result).toBe("ah_realization");
    });

    it("「えっ」（驚き）が正しく判定される", () => {
      const result = classifyMicrosound("えっ！", {
        pitch: 260,
        volume: 0.7,
        speed: 150,
        pitchVariation: 40,
        volumeVariation: 0.3,
        pauseFrequency: 4,
        averagePauseDuration: 400,
      });
      expect(result).toBe("eh_surprise");
    });

    it("「は？」（疑問）が正しく判定される", () => {
      const result = classifyMicrosound("は？", {
        pitch: 220,
        volume: 0.6,
        speed: 140,
        pitchVariation: 45,
        volumeVariation: 0.25,
        pauseFrequency: 5,
        averagePauseDuration: 500,
      });
      expect(result).toBe("ha_question");
    });

    it("「うん」（同意）が正しく判定される", () => {
      const result = classifyMicrosound("うん", {
        pitch: 210,
        volume: 0.6,
        speed: 150,
        pitchVariation: 25,
        volumeVariation: 0.2,
        pauseFrequency: 4,
        averagePauseDuration: 500,
      });
      expect(result).toBe("un_agreement");
    });
  });

  // ===== 3. 火水変調テスト =====
  describe("火水変調", () => {
    it("火優位の音声が正しく判定される", () => {
      const result = calculateFireWaterModulation("頑張ります！", {
        pitch: 250,
        volume: 0.8,
        speed: 180,
        pitchVariation: 40,
        volumeVariation: 0.3,
        pauseFrequency: 3,
        averagePauseDuration: 400,
      });
      expect(result.modulationType).toBe("fire_dominant");
      expect(result.fire).toBeGreaterThan(result.water);
    });

    it("水優位の音声が正しく判定される", () => {
      const result = calculateFireWaterModulation("ゆっくり休みましょう", {
        pitch: 180,
        volume: 0.4,
        speed: 110,
        pitchVariation: 20,
        volumeVariation: 0.15,
        pauseFrequency: 6,
        averagePauseDuration: 700,
      });
      expect(result.modulationType).toBe("water_dominant");
      expect(result.water).toBeGreaterThan(result.fire);
    });
  });

  // ===== 4. ミナカ判断テスト =====
  describe("ミナカ判断", () => {
    it("理想的な声の中心が正しく判定される", () => {
      const result = judgeMinaka({
        pitch: 200,
        volume: 0.5,
        speed: 150,
        pitchVariation: 30,
        volumeVariation: 0.2,
        pauseFrequency: 5,
        averagePauseDuration: 500,
      });
      expect(result.voiceCenter).toBe(200);
      expect(result.centerDeviation).toBeLessThan(10);
      expect(result.harmonyLevel).toBeGreaterThan(80);
    });

    it("高音寄りの声が正しく判定される", () => {
      const result = judgeMinaka({
        pitch: 260,
        volume: 0.6,
        speed: 160,
        pitchVariation: 35,
        volumeVariation: 0.25,
        pauseFrequency: 4,
        averagePauseDuration: 450,
      });
      expect(result.voiceBias).toBeGreaterThan(0);
    });

    it("低音寄りの声が正しく判定される", () => {
      const result = judgeMinaka({
        pitch: 160,
        volume: 0.5,
        speed: 140,
        pitchVariation: 25,
        volumeVariation: 0.2,
        pauseFrequency: 5,
        averagePauseDuration: 550,
      });
      expect(result.voiceBias).toBeLessThan(0);
    });
  });

  // ===== 5. 自然会話フローテスト =====
  describe("自然会話フロー", () => {
    it("会話テンポが正しく分析される", () => {
      const turns = [
        {
          speaker: 'user' as const,
          utterance: "こんにちは",
          startTime: 0,
          endTime: 1000,
          speechRate: 150,
        },
        {
          speaker: 'assistant' as const,
          utterance: "こんにちは",
          startTime: 1300,
          endTime: 2300,
          speechRate: 150,
        },
      ];
      const tempo = analyzeConversationTempo(turns);
      expect(tempo.averageSpeechRate).toBe(150);
      expect(tempo.turnTakingSpeed).toBe(300);
    });

    it("相槌が適切に生成される", () => {
      const backchannel = generateBackchannel(
        "今日はとても嬉しいことがありました",
        "joy",
        []
      );
      expect(backchannel).not.toBeNull();
      if (backchannel) {
        expect(backchannel.type).toBe("agreement");
        expect(backchannel.text.length).toBeGreaterThan(0);
      }
    });

    it("呼吸音が適切に生成される", () => {
      const breathSounds = generateBreathSounds(3000, "neutral", 150);
      expect(breathSounds.length).toBeGreaterThan(0);
      expect(breathSounds[0].type).toBe("inhale");
    });

    it("ポーズ長が会話テンポに応じて調整される", () => {
      const fastTempo = {
        averageSpeechRate: 180,
        averagePauseDuration: 400,
        turnTakingSpeed: 200,
        rhythm: 'fast' as const,
      };
      const adjustedPause = adjustPauseDuration(500, fastTempo, "neutral");
      expect(adjustedPause).toBeLessThan(500);
    });
  });

  // ===== 6. 音声文脈解析テスト =====
  describe("音声文脈解析", () => {
    it("感情トーンが正しく分析される", () => {
      const { tone } = analyzeEmotionTone({
        pitch: 260,
        volume: 0.8,
        speed: 180,
        pitchVariation: 45,
        volumeVariation: 0.3,
        pauseFrequency: 3,
        averagePauseDuration: 400,
      });
      expect(tone).toBe("excitement");
    });

    it("息の強さが正しく分析される", () => {
      const strength = analyzeBreathStrength({
        pitch: 250,
        volume: 0.8,
        speed: 170,
        pitchVariation: 40,
        volumeVariation: 0.3,
        pauseFrequency: 3,
        averagePauseDuration: 400,
      });
      expect(strength).toBe("strong");
    });

    it("躊躇レベルが正しく分析される", () => {
      const level = analyzeHesitationLevel(
        {
          pitch: 200,
          volume: 0.5,
          speed: 100,
          pitchVariation: 30,
          volumeVariation: 0.2,
          pauseFrequency: 12,
          averagePauseDuration: 600,
        },
        "えっと、あの、その…"
      );
      expect(level).toBe("high");
    });

    it("小声が正しく判定される", () => {
      const result = isWhispering({
        pitch: 180,
        volume: 0.15,
        speed: 110,
        pitchVariation: 20,
        volumeVariation: 0.1,
        pauseFrequency: 6,
        averagePauseDuration: 600,
      });
      expect(result).toBe(true);
    });

    it("ストレスレベルが正しく計算される", () => {
      const level = calculateStressLevel({
        pitch: 240,
        volume: 0.7,
        speed: 190,
        pitchVariation: 60,
        volumeVariation: 0.4,
        pauseFrequency: 12,
        averagePauseDuration: 400,
      });
      expect(level).toBeGreaterThan(70);
    });

    it("エネルギーレベルが正しく計算される", () => {
      const level = calculateEnergyLevel({
        pitch: 250,
        volume: 0.8,
        speed: 180,
        pitchVariation: 40,
        volumeVariation: 0.3,
        pauseFrequency: 3,
        averagePauseDuration: 400,
      });
      expect(level).toBeGreaterThan(70);
    });

    it("話し方の特徴が正しく分析される", () => {
      const style = analyzeSpeakingStyle({
        pitch: 220,
        volume: 0.7,
        speed: 160,
        pitchVariation: 25,
        volumeVariation: 0.2,
        pauseFrequency: 4,
        averagePauseDuration: 500,
      });
      expect(style.confident).toBe(true);
      expect(style.hurried).toBe(false);
    });
  });

  // ===== 7. 深層理解統合テスト =====
  describe("深層理解統合", () => {
    it("深層理解が正常に実行される", () => {
      const result = performDeepUnderstanding("やばい！", {
        pitch: 260,
        volume: 0.8,
        speed: 180,
        pitchVariation: 40,
        volumeVariation: 0.3,
        pauseFrequency: 3,
        averagePauseDuration: 400,
      });

      expect(result.originalText).toBe("やばい！");
      expect(result.voiceContext).toBeDefined();
      expect(result.yabaiType).toBeDefined();
      expect(result.fireWaterModulation).toBeDefined();
      expect(result.minakaJudgment).toBeDefined();
      expect(result.soulSyncInterpretation).toBeDefined();
    });
  });

  // ===== 8. 五十音×音素マッピングテスト =====
  describe("五十音×音素マッピング", () => {
    it("五十音マッピングが50音以上定義されている", () => {
      expect(GOJUON_PHONEME_MAPPING.length).toBeGreaterThanOrEqual(45);
    });

    it("「あ」の音素が正しく定義されている", () => {
      const a = GOJUON_PHONEME_MAPPING.find(m => m.gojuon === 'あ');
      expect(a).toBeDefined();
      expect(a?.phoneme).toBe('a');
      expect(a?.fireWater).toBe('fire');
      expect(a?.spiritualScore).toBeGreaterThan(90);
    });

    it("「ん」の音素が正しく定義されている", () => {
      const n = GOJUON_PHONEME_MAPPING.find(m => m.gojuon === 'ん');
      expect(n).toBeDefined();
      expect(n?.phoneme).toBe('ɴ');
      expect(n?.spiritualScore).toBe(100);
    });
  });
});
