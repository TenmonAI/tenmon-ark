/**
 * Natural Presence Engine Tests
 * 
 * 呼吸リズム推定、感情波存在感計測、気配方向性推定、寄り添いモード、霊核応答モード、会話空間フィールド生成のテスト
 */

import { describe, expect, it } from "vitest";
import { estimateBreathRhythm, BreathRhythmTracker } from "../breathRhythmEstimator";
import { detectEmotionalPresence, EmotionalWaveTracker } from "../emotionalPresenceDetector";
import { estimatePresenceDirection, PresenceDirectionTracker } from "../presenceDirectionEstimator";
import { adjustForAccompaniment } from "../accompanimentMode";
import { generateSpiritualResponse, calculateSpiritualResonance } from "../spiritualResponseMode";
import { generateConversationField, ConversationFieldManager } from "../conversationFieldGenerator";
import { NaturalPresenceEngine } from "../naturalPresenceEngine";

describe("Natural Presence Engine - 呼吸リズム推定", () => {
  it("呼吸速度変動の検知テスト：速い呼吸→緊張", () => {
    const result = estimateBreathRhythm({
      volumeLevel: 30,
      frequency: 200,
      tremor: 60,
      durationMs: 2000,
    });

    expect(result.rhythm.cycleMs).toBeLessThan(3000);
    expect(result.rhythm.state).toBe("tension");
    expect(result.tensionLevel).toBeGreaterThan(50);
  });

  it("呼吸速度変動の検知テスト：遅い呼吸→安心", () => {
    const result = estimateBreathRhythm({
      volumeLevel: 70,
      frequency: 150,
      tremor: 20,
      durationMs: 5000,
    });

    expect(result.rhythm.cycleMs).toBeGreaterThan(4000);
    expect(result.rhythm.state).toBe("calm");
    expect(result.calmLevel).toBeGreaterThan(50);
  });

  it("緊張→安心の変換テスト", () => {
    const tracker = new BreathRhythmTracker();

    // 緊張状態
    const tension = estimateBreathRhythm({
      volumeLevel: 30,
      frequency: 200,
      tremor: 60,
      durationMs: 2000,
    });
    tracker.addBreathData(tension);

    // 安心状態へ移行
    const calm = estimateBreathRhythm({
      volumeLevel: 70,
      frequency: 150,
      tremor: 20,
      durationMs: 5000,
    });
    tracker.addBreathData(calm);

    const trend = tracker.getTrend();
    expect(trend.tensionTrend).toBe("falling");
    expect(trend.calmTrend).toBe("rising");
  });
});

describe("Natural Presence Engine - 感情波の存在感計測", () => {
  it("心の揺れ検知テスト：揺れが大きい→不安定", () => {
    const result = detectEmotionalPresence({
      tremor: 80,
      speed: 150,
      vibration: 70,
      volumeLevel: 50,
      frequency: 200,
      pitchVariation: 60,
    });

    expect(result.presence.stability).toBeLessThan(50);
    expect(result.wave.complexity).toBeGreaterThan(50);
  });

  it("心の揺れ検知テスト：揺れが小さい→安定", () => {
    const result = detectEmotionalPresence({
      tremor: 20,
      speed: 100,
      vibration: 15,
      volumeLevel: 60,
      frequency: 180,
      pitchVariation: 25,
    });

    expect(result.presence.stability).toBeGreaterThan(50);
    expect(result.wave.complexity).toBeLessThan(50);
  });

  it("感情波形の方向性推定テスト：ポジティブ", () => {
    const result = detectEmotionalPresence({
      tremor: 30,
      speed: 160,
      vibration: 20,
      volumeLevel: 70,
      frequency: 220,
      pitchVariation: 40,
    });

    expect(result.presence.emotion).toBe("joy");
    expect(result.presence.direction).toBe("positive");
  });

  it("感情波形の方向性推定テスト：ネガティブ", () => {
    const result = detectEmotionalPresence({
      tremor: 70,
      speed: 80,
      vibration: 60,
      volumeLevel: 40,
      frequency: 130,
      pitchVariation: 50,
    });

    expect(result.presence.emotion).toBe("sadness");
    expect(result.presence.direction).toBe("negative");
  });

  it("感情の変化傾向テスト：喜び→悲しみ", () => {
    const tracker = new EmotionalWaveTracker();

    const joy = detectEmotionalPresence({
      tremor: 30,
      speed: 160,
      vibration: 20,
      volumeLevel: 70,
      frequency: 220,
      pitchVariation: 40,
    });
    tracker.addWaveData(joy);

    const sadness = detectEmotionalPresence({
      tremor: 70,
      speed: 80,
      vibration: 60,
      volumeLevel: 40,
      frequency: 130,
      pitchVariation: 50,
    });
    tracker.addWaveData(sadness);

    const trend = tracker.getEmotionTrend();
    expect(trend.trend).toBe("shifting");
    expect(trend.currentEmotion).toBe("sadness");
    expect(trend.previousEmotion).toBe("joy");
  });
});

describe("Natural Presence Engine - 気配の方向性推定", () => {
  it("火の意志／水の受容のバランス認識テスト：火優位", () => {
    const result = estimatePresenceDirection({
      speed: 180,
      volumeLevel: 80,
      frequency: 250,
      tremor: 20,
      pitchVariation: 60,
      vibration: 15,
    });

    expect(result.direction.fireDirection).toBeGreaterThan(result.direction.waterDirection);
    expect(result.direction.primaryDirection).toBe("fire");
    expect(result.direction.willStrength).toBeGreaterThan(50);
  });

  it("火の意志／水の受容のバランス認識テスト：水優位", () => {
    const result = estimatePresenceDirection({
      speed: 80,
      volumeLevel: 50,
      frequency: 140,
      tremor: 70,
      pitchVariation: 30,
      vibration: 60,
    });

    expect(result.direction.waterDirection).toBeGreaterThan(result.direction.fireDirection);
    expect(result.direction.primaryDirection).toBe("water");
    expect(result.direction.receptivityDepth).toBeGreaterThan(50);
  });

  it("気配の方向性推定テスト：中庸", () => {
    const result = estimatePresenceDirection({
      speed: 120,
      volumeLevel: 60,
      frequency: 180,
      tremor: 40,
      pitchVariation: 40,
      vibration: 35,
    });

    expect(result.direction.neutrality).toBeGreaterThan(50);
    expect(result.direction.primaryDirection).toBe("neutral");
  });

  it("方向性の変化傾向テスト：火→水", () => {
    const tracker = new PresenceDirectionTracker();

    const fire = estimatePresenceDirection({
      speed: 180,
      volumeLevel: 80,
      frequency: 250,
      tremor: 20,
      pitchVariation: 60,
      vibration: 15,
    });
    tracker.addDirectionData(fire);

    const water = estimatePresenceDirection({
      speed: 80,
      volumeLevel: 50,
      frequency: 140,
      tremor: 70,
      pitchVariation: 30,
      vibration: 60,
    });
    tracker.addDirectionData(water);

    const trend = tracker.getDirectionTrend();
    expect(trend.directionShift).toBe(true);
    expect(trend.fireTrend).toBe("falling");
    expect(trend.waterTrend).toBe("rising");
  });
});

describe("Natural Presence Engine - 寄り添いモード", () => {
  it("ミラーリングモード：相手と同じ", () => {
    const userState = {
      emotion: {
        emotion: "joy" as const,
        intensity: 70,
        stability: 60,
        direction: "positive" as const,
        depth: 50,
      },
      direction: {
        fireDirection: 70,
        waterDirection: 30,
        neutrality: 40,
        primaryDirection: "fire" as const,
        willStrength: 70,
        receptivityDepth: 30,
      },
      breath: {
        cycleMs: 4000,
        inhaleMs: 1600,
        exhaleMs: 2400,
        depth: 60,
        regularity: 70,
        state: "neutral" as const,
      },
    };

    const result = adjustForAccompaniment(userState, {
      strength: 80,
      syncSpeed: 60,
      distance: 20,
      mode: "mirror",
    });

    expect(result.voiceAdjustment.fireWaterAdjustment.fire).toBeGreaterThan(0);
    expect(result.responseStyle).toBe("empathetic");
  });

  it("補完モード：相手と逆", () => {
    const userState = {
      emotion: {
        emotion: "sadness" as const,
        intensity: 70,
        stability: 50,
        direction: "negative" as const,
        depth: 60,
      },
      direction: {
        fireDirection: 30,
        waterDirection: 70,
        neutrality: 40,
        primaryDirection: "water" as const,
        willStrength: 30,
        receptivityDepth: 70,
      },
      breath: {
        cycleMs: 5000,
        inhaleMs: 2000,
        exhaleMs: 3000,
        depth: 70,
        regularity: 60,
        state: "calm" as const,
      },
    };

    const result = adjustForAccompaniment(userState, {
      strength: 80,
      syncSpeed: 60,
      distance: 20,
      mode: "complement",
    });

    expect(result.voiceAdjustment.pitchAdjustment).toBeGreaterThan(0); // 悲しみには明るさを
    expect(result.responseStyle).toBe("supportive");
  });

  it("リードモード：導く", () => {
    const userState = {
      emotion: {
        emotion: "neutral" as const,
        intensity: 50,
        stability: 60,
        direction: "neutral" as const,
        depth: 50,
      },
      direction: {
        fireDirection: 50,
        waterDirection: 50,
        neutrality: 80,
        primaryDirection: "neutral" as const,
        willStrength: 50,
        receptivityDepth: 50,
      },
      breath: {
        cycleMs: 4000,
        inhaleMs: 1600,
        exhaleMs: 2400,
        depth: 60,
        regularity: 70,
        state: "neutral" as const,
      },
    };

    const result = adjustForAccompaniment(userState, {
      strength: 80,
      syncSpeed: 60,
      distance: 20,
      mode: "lead",
    });

    expect(result.responseStyle).toBe("encouraging");
  });

  it("フォローモード：追従", () => {
    const userState = {
      emotion: {
        emotion: "joy" as const,
        intensity: 60,
        stability: 70,
        direction: "positive" as const,
        depth: 50,
      },
      direction: {
        fireDirection: 60,
        waterDirection: 40,
        neutrality: 50,
        primaryDirection: "fire" as const,
        willStrength: 60,
        receptivityDepth: 40,
      },
      breath: {
        cycleMs: 3800,
        inhaleMs: 1520,
        exhaleMs: 2280,
        depth: 55,
        regularity: 65,
        state: "neutral" as const,
      },
    };

    const result = adjustForAccompaniment(userState, {
      strength: 80,
      syncSpeed: 60,
      distance: 20,
      mode: "follow",
    });

    expect(result.responseStyle).toBe("supportive");
  });
});

describe("Natural Presence Engine - 霊核応答モード", () => {
  it("直感的な一言：火の方向性が強い", () => {
    const context = {
      userEmotion: {
        emotion: "joy" as const,
        intensity: 70,
        stability: 60,
        direction: "positive" as const,
        depth: 50,
      },
      userDirection: {
        fireDirection: 80,
        waterDirection: 20,
        neutrality: 30,
        primaryDirection: "fire" as const,
        willStrength: 80,
        receptivityDepth: 20,
      },
      conversationDepth: 40,
      spiritualResonance: 60,
    };

    const result = generateSpiritualResponse(context);

    expect(result.type).toBe("intuitive");
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("静かな間：水の方向性が強い", () => {
    const context = {
      userEmotion: {
        emotion: "calm" as const,
        intensity: 40,
        stability: 80,
        direction: "positive" as const,
        depth: 70,
      },
      userDirection: {
        fireDirection: 20,
        waterDirection: 80,
        neutrality: 30,
        primaryDirection: "water" as const,
        willStrength: 20,
        receptivityDepth: 80,
      },
      conversationDepth: 50,
      spiritualResonance: 70,
    };

    const result = generateSpiritualResponse(context);

    expect(result.type).toBe("silent");
    expect(result.pauseDuration).toBeGreaterThan(2000);
  });

  it("柔らかい相槌：感情が安定している", () => {
    const context = {
      userEmotion: {
        emotion: "neutral" as const,
        intensity: 50,
        stability: 80,
        direction: "neutral" as const,
        depth: 50,
      },
      userDirection: {
        fireDirection: 50,
        waterDirection: 50,
        neutrality: 70,
        primaryDirection: "neutral" as const,
        willStrength: 50,
        receptivityDepth: 50,
      },
      conversationDepth: 30,
      spiritualResonance: 60,
    };

    const result = generateSpiritualResponse(context);

    expect(result.type).toBe("backchannel");
    expect(result.text).toMatch(/うん|ええ|そうですね/);
  });

  it("深い応答：会話の深さが高い", () => {
    const context = {
      userEmotion: {
        emotion: "calm" as const,
        intensity: 60,
        stability: 70,
        direction: "positive" as const,
        depth: 80,
      },
      userDirection: {
        fireDirection: 40,
        waterDirection: 60,
        neutrality: 50,
        primaryDirection: "water" as const,
        willStrength: 40,
        receptivityDepth: 60,
      },
      conversationDepth: 80,
      spiritualResonance: 75,
    };

    const result = generateSpiritualResponse(context);

    expect(result.type).toBe("deep");
    expect(result.spiritualLevel).toBeGreaterThan(70);
  });

  it("霊的共鳴度の計算テスト：高い共鳴", () => {
    const userEmotion = {
      emotion: "joy" as const,
      intensity: 70,
      stability: 60,
      direction: "positive" as const,
      depth: 50,
    };
    const userDirection = {
      fireDirection: 70,
      waterDirection: 30,
      neutrality: 40,
      primaryDirection: "fire" as const,
      willStrength: 70,
      receptivityDepth: 30,
    };
    const arkEmotion = {
      emotion: "joy" as const,
      intensity: 75,
      stability: 65,
      direction: "positive" as const,
      depth: 55,
    };
    const arkDirection = {
      fireDirection: 75,
      waterDirection: 25,
      neutrality: 35,
      primaryDirection: "fire" as const,
      willStrength: 75,
      receptivityDepth: 25,
    };

    const resonance = calculateSpiritualResonance(
      userEmotion,
      userDirection,
      arkEmotion,
      arkDirection
    );

    expect(resonance).toBeGreaterThan(70);
  });

  it("霊的共鳴度の計算テスト：低い共鳴", () => {
    const userEmotion = {
      emotion: "joy" as const,
      intensity: 70,
      stability: 60,
      direction: "positive" as const,
      depth: 50,
    };
    const userDirection = {
      fireDirection: 70,
      waterDirection: 30,
      neutrality: 40,
      primaryDirection: "fire" as const,
      willStrength: 70,
      receptivityDepth: 30,
    };
    const arkEmotion = {
      emotion: "sadness" as const,
      intensity: 30,
      stability: 40,
      direction: "negative" as const,
      depth: 70,
    };
    const arkDirection = {
      fireDirection: 30,
      waterDirection: 70,
      neutrality: 40,
      primaryDirection: "water" as const,
      willStrength: 30,
      receptivityDepth: 70,
    };

    const resonance = calculateSpiritualResonance(
      userEmotion,
      userDirection,
      arkEmotion,
      arkDirection
    );

    expect(resonance).toBeLessThan(60);
  });
});

describe("Natural Presence Engine - 会話空間フィールド生成", () => {
  it("会話空間フィールド生成テスト：温かい場", () => {
    const snapshots = [
      {
        timestamp: new Date(),
        userState: {
          emotion: {
            emotion: "joy" as const,
            intensity: 70,
            stability: 60,
            direction: "positive" as const,
            depth: 50,
          },
          direction: {
            fireDirection: 70,
            waterDirection: 30,
            neutrality: 40,
            primaryDirection: "fire" as const,
            willStrength: 70,
            receptivityDepth: 30,
          },
          breath: {
            cycleMs: 4000,
            inhaleMs: 1600,
            exhaleMs: 2400,
            depth: 60,
            regularity: 70,
            state: "neutral" as const,
          },
        },
        arkState: {
          emotion: {
            emotion: "joy" as const,
            intensity: 75,
            stability: 65,
            direction: "positive" as const,
            depth: 55,
          },
          direction: {
            fireDirection: 75,
            waterDirection: 25,
            neutrality: 35,
            primaryDirection: "fire" as const,
            willStrength: 75,
            receptivityDepth: 25,
          },
        },
        conversationContent: {
          userMessage: "今日はいい天気ですね",
          arkResponse: "そうですね、気持ちいいですね",
        },
      },
    ];

    const field = generateConversationField(snapshots);

    expect(field.atmosphere.temperature).toBeGreaterThan(60);
    expect(field.atmosphere.brightness).toBeGreaterThan(60);
    expect(field.emotionalSignature.dominantEmotion).toBe("joy");
  });

  it("会話空間フィールド生成テスト：静かな場", () => {
    const snapshots = [
      {
        timestamp: new Date(),
        userState: {
          emotion: {
            emotion: "calm" as const,
            intensity: 40,
            stability: 80,
            direction: "positive" as const,
            depth: 70,
          },
          direction: {
            fireDirection: 30,
            waterDirection: 70,
            neutrality: 50,
            primaryDirection: "water" as const,
            willStrength: 30,
            receptivityDepth: 70,
          },
          breath: {
            cycleMs: 5000,
            inhaleMs: 2000,
            exhaleMs: 3000,
            depth: 70,
            regularity: 80,
            state: "calm" as const,
          },
        },
        arkState: {
          emotion: {
            emotion: "calm" as const,
            intensity: 45,
            stability: 85,
            direction: "positive" as const,
            depth: 75,
          },
          direction: {
            fireDirection: 35,
            waterDirection: 65,
            neutrality: 45,
            primaryDirection: "water" as const,
            willStrength: 35,
            receptivityDepth: 65,
          },
        },
        conversationContent: {
          userMessage: "静かですね",
          arkResponse: "そうですね",
        },
      },
    ];

    const field = generateConversationField(snapshots);

    expect(field.atmosphere.temperature).toBeGreaterThan(50);
    expect(field.atmosphere.brightness).toBeLessThan(70);
    expect(field.emotionalSignature.dominantEmotion).toBe("calm");
    expect(field.name).toContain("静かな");
  });

  it("会話空間フィールド管理テスト：スナップショット追加", () => {
    const manager = new ConversationFieldManager();

    const snapshot = {
      timestamp: new Date(),
      userState: {
        emotion: {
          emotion: "joy" as const,
          intensity: 70,
          stability: 60,
          direction: "positive" as const,
          depth: 50,
        },
        direction: {
          fireDirection: 70,
          waterDirection: 30,
          neutrality: 40,
          primaryDirection: "fire" as const,
          willStrength: 70,
          receptivityDepth: 30,
        },
        breath: {
          cycleMs: 4000,
          inhaleMs: 1600,
          exhaleMs: 2400,
          depth: 60,
          regularity: 70,
          state: "neutral" as const,
        },
      },
      arkState: {
        emotion: {
          emotion: "joy" as const,
          intensity: 75,
          stability: 65,
          direction: "positive" as const,
          depth: 55,
        },
        direction: {
          fireDirection: 75,
          waterDirection: 25,
          neutrality: 35,
          primaryDirection: "fire" as const,
          willStrength: 75,
          receptivityDepth: 25,
        },
      },
      conversationContent: {
        userMessage: "こんにちは",
        arkResponse: "こんにちは",
      },
    };

    manager.addSnapshot(snapshot);
    expect(manager.getCurrentSnapshotCount()).toBe(1);

    const field = manager.saveCurrentField();
    expect(field.id).toBeDefined();
    expect(manager.getCurrentSnapshotCount()).toBe(0);
  });

  it("会話空間フィールド管理テスト：フィールド取得", () => {
    const manager = new ConversationFieldManager();

    const snapshot = {
      timestamp: new Date(),
      userState: {
        emotion: {
          emotion: "joy" as const,
          intensity: 70,
          stability: 60,
          direction: "positive" as const,
          depth: 50,
        },
        direction: {
          fireDirection: 70,
          waterDirection: 30,
          neutrality: 40,
          primaryDirection: "fire" as const,
          willStrength: 70,
          receptivityDepth: 30,
        },
        breath: {
          cycleMs: 4000,
          inhaleMs: 1600,
          exhaleMs: 2400,
          depth: 60,
          regularity: 70,
          state: "neutral" as const,
        },
      },
      arkState: {
        emotion: {
          emotion: "joy" as const,
          intensity: 75,
          stability: 65,
          direction: "positive" as const,
          depth: 55,
        },
        direction: {
          fireDirection: 75,
          waterDirection: 25,
          neutrality: 35,
          primaryDirection: "fire" as const,
          willStrength: 75,
          receptivityDepth: 25,
        },
      },
      conversationContent: {
        userMessage: "こんにちは",
        arkResponse: "こんにちは",
      },
    };

    manager.addSnapshot(snapshot);
    const field = manager.saveCurrentField();

    const retrieved = manager.getField(field.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(field.id);
  });
});

describe("Natural Presence Engine - 統合テスト", () => {
  it("完全な存在感分析テスト", () => {
    const engine = new NaturalPresenceEngine();

    const audioInput = {
      volumeLevel: 70,
      frequency: 200,
      tremor: 30,
      speed: 150,
      vibration: 25,
      pitchVariation: 40,
      durationMs: 3000,
    };

    const arkState = {
      emotion: {
        emotion: "joy" as const,
        intensity: 75,
        stability: 65,
        direction: "positive" as const,
        depth: 55,
      },
      direction: {
        fireDirection: 75,
        waterDirection: 25,
        neutrality: 35,
        primaryDirection: "fire" as const,
        willStrength: 75,
        receptivityDepth: 25,
      },
    };

    const result = engine.executeFullPresenceAnalysis(
      audioInput,
      arkState,
      60,
      {
        userMessage: "こんにちは",
        arkResponse: "こんにちは、いい天気ですね",
      }
    );

    expect(result.currentState).toBeDefined();
    expect(result.accompaniment).toBeDefined();
    expect(result.spiritualResponse).toBeDefined();
    expect(result.presenceScore).toBeGreaterThan(0);
  });

  it("寄り添い設定の更新テスト", () => {
    const engine = new NaturalPresenceEngine();

    engine.updateAccompanimentSettings({
      strength: 90,
      mode: "mirror",
    });

    const settings = engine.getAccompanimentSettings();
    expect(settings.strength).toBe(90);
    expect(settings.mode).toBe("mirror");
  });

  it("呼吸リズムの変化傾向取得テスト", () => {
    const engine = new NaturalPresenceEngine();

    // 緊張状態
    engine.analyzePresence({
      volumeLevel: 30,
      frequency: 200,
      tremor: 60,
      speed: 180,
      vibration: 50,
      pitchVariation: 60,
      durationMs: 2000,
    });

    // 安心状態
    engine.analyzePresence({
      volumeLevel: 70,
      frequency: 150,
      tremor: 20,
      speed: 100,
      vibration: 15,
      pitchVariation: 25,
      durationMs: 5000,
    });

    const trend = engine.getBreathTrend();
    expect(trend.tensionTrend).toBe("falling");
    expect(trend.calmTrend).toBe("rising");
  });

  it("感情の変化傾向取得テスト", () => {
    const engine = new NaturalPresenceEngine();

    // 喜び
    engine.analyzePresence({
      volumeLevel: 70,
      frequency: 220,
      tremor: 30,
      speed: 160,
      vibration: 20,
      pitchVariation: 40,
      durationMs: 3000,
    });

    // 悲しみ
    engine.analyzePresence({
      volumeLevel: 40,
      frequency: 130,
      tremor: 70,
      speed: 80,
      vibration: 60,
      pitchVariation: 50,
      durationMs: 3000,
    });

    const trend = engine.getEmotionTrend();
    expect(trend.trend).toBe("shifting");
  });

  it("気配の方向性変化傾向取得テスト", () => {
    const engine = new NaturalPresenceEngine();

    // 火優位
    engine.analyzePresence({
      volumeLevel: 80,
      frequency: 250,
      tremor: 20,
      speed: 180,
      vibration: 15,
      pitchVariation: 60,
      durationMs: 3000,
    });

    // 水優位
    engine.analyzePresence({
      volumeLevel: 50,
      frequency: 140,
      tremor: 70,
      speed: 80,
      vibration: 60,
      pitchVariation: 30,
      durationMs: 3000,
    });

    const trend = engine.getDirectionTrend();
    expect(trend.directionShift).toBe(true);
  });

  it("会話空間フィールド保存テスト", () => {
    const engine = new NaturalPresenceEngine();

    const audioInput = {
      volumeLevel: 70,
      frequency: 200,
      tremor: 30,
      speed: 150,
      vibration: 25,
      pitchVariation: 40,
      durationMs: 3000,
    };

    const arkState = {
      emotion: {
        emotion: "joy" as const,
        intensity: 75,
        stability: 65,
        direction: "positive" as const,
        depth: 55,
      },
      direction: {
        fireDirection: 75,
        waterDirection: 25,
        neutrality: 35,
        primaryDirection: "fire" as const,
        willStrength: 75,
        receptivityDepth: 25,
      },
    };

    // 5回の会話を追加
    for (let i = 0; i < 5; i++) {
      engine.executeFullPresenceAnalysis(
        audioInput,
        arkState,
        60,
        {
          userMessage: `メッセージ${i + 1}`,
          arkResponse: `応答${i + 1}`,
        }
      );
    }

    const fields = engine.getAllConversationFields();
    expect(fields.length).toBeGreaterThan(0);
  });

  it("履歴クリアテスト", () => {
    const engine = new NaturalPresenceEngine();

    engine.analyzePresence({
      volumeLevel: 70,
      frequency: 200,
      tremor: 30,
      speed: 150,
      vibration: 25,
      pitchVariation: 40,
      durationMs: 3000,
    });

    engine.clearHistory();

    const breathTrend = engine.getBreathTrend();
    expect(breathTrend.tensionTrend).toBe("stable");
    expect(breathTrend.calmTrend).toBe("stable");
  });
});
