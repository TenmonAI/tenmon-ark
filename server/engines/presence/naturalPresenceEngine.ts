/**
 * Natural Presence Engine
 * 自然な存在感エンジン
 * 
 * 呼吸リズム推定、感情波存在感計測、気配方向性推定、寄り添いモード、霊核応答モード、会話空間フィールド生成を統合する。
 */

import {
  estimateBreathRhythm,
  BreathRhythmTracker,
  type BreathAnalysisResult,
  type BreathRhythm,
} from "./breathRhythmEstimator";

import {
  detectEmotionalPresence,
  EmotionalWaveTracker,
  type PresenceAnalysisResult,
  type EmotionalPresence,
} from "./emotionalPresenceDetector";

import {
  estimatePresenceDirection,
  PresenceDirectionTracker,
  type DirectionEstimationResult,
  type PresenceDirection,
} from "./presenceDirectionEstimator";

import {
  adjustForAccompaniment,
  type AccompanimentSettings,
  type AccompanimentResult,
} from "./accompanimentMode";

import {
  generateSpiritualResponse,
  calculateSpiritualResonance,
  type SpiritualResponse,
  type SpiritualResponseContext,
} from "./spiritualResponseMode";

import {
  generateConversationField,
  ConversationFieldManager,
  type ConversationField,
  type FieldSnapshot,
} from "./conversationFieldGenerator";

export interface AudioInput {
  /** 音量レベル（0-100） */
  volumeLevel: number;
  /** 音声周波数（Hz） */
  frequency: number;
  /** 音声の揺れ（0-100） */
  tremor: number;
  /** 音声の速度（words per minute） */
  speed: number;
  /** 音声の震え（0-100） */
  vibration: number;
  /** ピッチの変動（0-100） */
  pitchVariation: number;
  /** サンプリング時間（ミリ秒） */
  durationMs: number;
}

export interface PresenceState {
  breath: BreathAnalysisResult;
  emotion: PresenceAnalysisResult;
  direction: DirectionEstimationResult;
  timestamp: Date;
}

export interface PresenceEngineResult {
  /** 現在の存在感状態 */
  currentState: PresenceState;
  /** 寄り添い調整 */
  accompaniment: AccompanimentResult | null;
  /** 霊核応答 */
  spiritualResponse: SpiritualResponse | null;
  /** 会話空間フィールド */
  conversationField: ConversationField | null;
  /** 総合的な存在感スコア（0-100） */
  presenceScore: number;
}

/**
 * Natural Presence Engineクラス
 */
export class NaturalPresenceEngine {
  private breathTracker = new BreathRhythmTracker();
  private emotionTracker = new EmotionalWaveTracker();
  private directionTracker = new PresenceDirectionTracker();
  private fieldManager = new ConversationFieldManager();
  
  private accompanimentSettings: AccompanimentSettings = {
    strength: 70,
    syncSpeed: 60,
    distance: 30,
    mode: "follow",
  };

  /**
   * 音声入力から存在感を分析
   */
  analyzePresence(audioInput: AudioInput): PresenceState {
    // 呼吸リズムを推定
    const breath = estimateBreathRhythm({
      volumeLevel: audioInput.volumeLevel,
      frequency: audioInput.frequency,
      tremor: audioInput.tremor,
      durationMs: audioInput.durationMs,
    });

    // 感情波の存在感を計測
    const emotion = detectEmotionalPresence({
      tremor: audioInput.tremor,
      speed: audioInput.speed,
      vibration: audioInput.vibration,
      volumeLevel: audioInput.volumeLevel,
      frequency: audioInput.frequency,
      pitchVariation: audioInput.pitchVariation,
    });

    // 気配の方向性を推定
    const direction = estimatePresenceDirection({
      speed: audioInput.speed,
      volumeLevel: audioInput.volumeLevel,
      frequency: audioInput.frequency,
      tremor: audioInput.tremor,
      pitchVariation: audioInput.pitchVariation,
      vibration: audioInput.vibration,
    });

    // 履歴に追加
    this.breathTracker.addBreathData(breath);
    this.emotionTracker.addWaveData(emotion);
    this.directionTracker.addDirectionData(direction);

    return {
      breath,
      emotion,
      direction,
      timestamp: new Date(),
    };
  }

  /**
   * 寄り添いモードで声色・間を調整
   */
  adjustForAccompaniment(userState: PresenceState): AccompanimentResult {
    return adjustForAccompaniment(
      {
        emotion: userState.emotion.presence,
        direction: userState.direction.direction,
        breath: userState.breath.rhythm,
      },
      this.accompanimentSettings
    );
  }

  /**
   * 霊核応答を生成
   */
  generateSpiritualResponse(
    userState: PresenceState,
    arkState: {
      emotion: EmotionalPresence;
      direction: PresenceDirection;
    },
    conversationDepth: number
  ): SpiritualResponse {
    // 霊的共鳴度を計算
    const spiritualResonance = calculateSpiritualResonance(
      userState.emotion.presence,
      userState.direction.direction,
      arkState.emotion,
      arkState.direction
    );

    const context: SpiritualResponseContext = {
      userEmotion: userState.emotion.presence,
      userDirection: userState.direction.direction,
      conversationDepth,
      spiritualResonance,
    };

    return generateSpiritualResponse(context);
  }

  /**
   * 会話スナップショットを追加
   */
  addConversationSnapshot(
    userState: PresenceState,
    arkState: {
      emotion: EmotionalPresence;
      direction: PresenceDirection;
    },
    conversationContent: {
      userMessage: string;
      arkResponse: string;
    }
  ): void {
    const snapshot: FieldSnapshot = {
      timestamp: new Date(),
      userState: {
        emotion: userState.emotion.presence,
        direction: userState.direction.direction,
        breath: userState.breath.rhythm,
      },
      arkState,
      conversationContent,
    };

    this.fieldManager.addSnapshot(snapshot);
  }

  /**
   * 現在の会話空間フィールドを保存
   */
  saveConversationField(): ConversationField {
    return this.fieldManager.saveCurrentField();
  }

  /**
   * 会話空間フィールドを取得
   */
  getConversationField(id: string): ConversationField | undefined {
    return this.fieldManager.getField(id);
  }

  /**
   * すべての会話空間フィールドを取得
   */
  getAllConversationFields(): ConversationField[] {
    return this.fieldManager.getAllFields();
  }

  /**
   * 総合的な存在感スコアを計算
   */
  calculatePresenceScore(state: PresenceState): number {
    const breathConfidence = state.breath.confidence;
    const emotionPresenceStrength = state.emotion.presenceStrength;
    const directionClarity = state.direction.clarity;

    return (breathConfidence * 0.3 + emotionPresenceStrength * 0.4 + directionClarity * 0.3);
  }

  /**
   * 完全な存在感分析を実行
   */
  executeFullPresenceAnalysis(
    audioInput: AudioInput,
    arkState: {
      emotion: EmotionalPresence;
      direction: PresenceDirection;
    },
    conversationDepth: number,
    conversationContent?: {
      userMessage: string;
      arkResponse: string;
    }
  ): PresenceEngineResult {
    // 存在感を分析
    const currentState = this.analyzePresence(audioInput);

    // 寄り添い調整を計算
    const accompaniment = this.adjustForAccompaniment(currentState);

    // 霊核応答を生成
    const spiritualResponse = this.generateSpiritualResponse(
      currentState,
      arkState,
      conversationDepth
    );

    // 会話スナップショットを追加（会話内容がある場合）
    let conversationField: ConversationField | null = null;
    if (conversationContent) {
      this.addConversationSnapshot(currentState, arkState, conversationContent);
      
      // 一定数のスナップショットが溜まったらフィールドを保存
      if (this.fieldManager.getCurrentSnapshotCount() >= 5) {
        conversationField = this.saveConversationField();
      }
    }

    // 総合的な存在感スコアを計算
    const presenceScore = this.calculatePresenceScore(currentState);

    return {
      currentState,
      accompaniment,
      spiritualResponse,
      conversationField,
      presenceScore,
    };
  }

  /**
   * 寄り添い設定を更新
   */
  updateAccompanimentSettings(settings: Partial<AccompanimentSettings>): void {
    this.accompanimentSettings = {
      ...this.accompanimentSettings,
      ...settings,
    };
  }

  /**
   * 寄り添い設定を取得
   */
  getAccompanimentSettings(): AccompanimentSettings {
    return { ...this.accompanimentSettings };
  }

  /**
   * 呼吸リズムの変化傾向を取得
   */
  getBreathTrend() {
    return this.breathTracker.getTrend();
  }

  /**
   * 感情の変化傾向を取得
   */
  getEmotionTrend() {
    return this.emotionTracker.getEmotionTrend();
  }

  /**
   * 気配の方向性変化傾向を取得
   */
  getDirectionTrend() {
    return this.directionTracker.getDirectionTrend();
  }

  /**
   * すべての履歴をクリア
   */
  clearHistory(): void {
    this.breathTracker.clear();
    this.emotionTracker.clear();
    this.directionTracker.clear();
    this.fieldManager.clearCurrentSnapshots();
  }
}
