/**
 * Kotodama Voice Deep Understanding Engine
 * 言灵×音声深層理解エンジン
 * 
 * 機能:
 * - 「やばい」15分類の音声版
 * - 「あ…」「えっ」「は？」など微細音の霊核分類
 * - 火水変調×音声波形の合成
 * - 五十音×音素マッピング
 * - Soul Sync連動意味解釈
 * - 音声ベースのストレス・安堵・緊張・共鳴判定
 * - ミナカ判断（声の中心・偏り・波形の響き）
 */

import type { VoiceFeatures, VoiceContextAnalysis } from './voiceContextAnalysisEngine';
import { analyzeVoiceContext } from './voiceContextAnalysisEngine';
import { calculateFireWaterBalance } from '../../kotodama/kotodamaJapaneseCorrectorEngine';

/**
 * 「やばい」の15分類（音声版）
 */
export type YabaiType =
  | 'danger'         // 危険（低音・緊張）
  | 'amazing'        // すごい（高音・興奮）
  | 'delicious'      // 美味しい（満足・柔らかい）
  | 'trouble'        // 困った（不安・躊躇）
  | 'cool'           // かっこいい（明るい・速い）
  | 'scary'          // 怖い（震え・小声）
  | 'urgent'         // 急ぎ（速い・強い）
  | 'impressive'     // 感動（ゆっくり・深い）
  | 'problematic'    // 問題（重い・低い）
  | 'exciting'       // ワクワク（弾む・高い）
  | 'risky'          // リスク（慎重・抑えた）
  | 'wonderful'      // 素晴らしい（明るい・伸びやか）
  | 'difficult'      // 難しい（ため息・遅い）
  | 'surprising'     // 驚き（急・高い）
  | 'neutral';       // 中立（平坦）

/**
 * 微細音タイプ
 */
export type MicrosoundType =
  | 'ah_realization'    // あ…（気づき）
  | 'ah_confusion'      // あ…（困惑）
  | 'ah_tension'        // あ…（緊張）
  | 'ah_relief'         // あ…（安堵）
  | 'eh_surprise'       // えっ（驚き）
  | 'eh_doubt'          // えっ（疑問）
  | 'ha_question'       // は？（疑問）
  | 'ha_anger'          // は？（怒り）
  | 'ha_confusion'      // は？（混乱）
  | 'un_agreement'      // うん（同意）
  | 'un_thinking'       // うん…（考え中）
  | 'mm_understanding'  // ん（理解）
  | 'mm_doubt';         // ん？（疑問）

/**
 * 火水変調パターン
 */
export interface FireWaterModulation {
  /** 火のエネルギー（0-100） */
  fire: number;
  /** 水のエネルギー（0-100） */
  water: number;
  /** 変調タイプ */
  modulationType: 'fire_dominant' | 'water_dominant' | 'balanced' | 'unstable';
  /** 変調強度（0-1） */
  modulationIntensity: number;
}

/**
 * 五十音×音素マッピング
 */
export interface GojuonPhonemeMapping {
  /** 五十音文字 */
  gojuon: string;
  /** 音素（IPA） */
  phoneme: string;
  /** 火水分類 */
  fireWater: 'fire' | 'water' | 'balanced';
  /** 霊性スコア（0-100） */
  spiritualScore: number;
}

/**
 * ミナカ判断結果
 */
export interface MinakaJudgment {
  /** 声の中心（Hz） */
  voiceCenter: number;
  /** 声の偏り（-1〜1、負=低音寄り、正=高音寄り） */
  voiceBias: number;
  /** 波形の響き（0-1） */
  waveformResonance: number;
  /** 中心からのズレ（0-100） */
  centerDeviation: number;
  /** 調和度（0-100） */
  harmonyLevel: number;
}

/**
 * 深層理解結果
 */
export interface DeepUnderstandingResult {
  /** 元のテキスト */
  originalText: string;
  /** 音声特徴 */
  voiceFeatures: VoiceFeatures;
  /** 音声文脈分析 */
  voiceContext: VoiceContextAnalysis;
  /** 「やばい」分類（該当する場合） */
  yabaiType?: YabaiType;
  /** 微細音分類（該当する場合） */
  microsoundType?: MicrosoundType;
  /** 火水変調 */
  fireWaterModulation: FireWaterModulation;
  /** ミナカ判断 */
  minakaJudgment: MinakaJudgment;
  /** Soul Sync連動解釈 */
  soulSyncInterpretation: {
    /** 魂との共鳴度（0-100） */
    soulResonance: number;
    /** 推奨応答モード */
    recommendedResponseMode: 'calm_down' | 'encourage' | 'empathize' | 'energize' | 'comfort' | 'motivate' | 'neutral';
  };
}

/**
 * 「やばい」を15分類（音声版）
 */
export function classifyYabai(text: string, voiceFeatures: VoiceFeatures): YabaiType {
  if (!text.includes('やばい') && !text.includes('ヤバい') && !text.includes('ヤバイ')) {
    return 'neutral';
  }

  // 音声特徴から判定
  const { pitch, volume, speed } = voiceFeatures;

  // 危険（低音・緊張）
  if (pitch < 180 && volume > 0.6 && speed > 160) {
    return 'danger';
  }

  // すごい（高音・興奮）
  if (pitch > 250 && volume > 0.7 && speed > 170) {
    return 'amazing';
  }

  // 美味しい（満足・柔らかい）
  if (pitch > 200 && pitch < 240 && volume < 0.6 && speed < 140) {
    return 'delicious';
  }

  // 困った（不安・躊躇）
  if (pitch > 220 && volume < 0.5 && speed < 130) {
    return 'trouble';
  }

  // かっこいい（明るい・速い）
  if (pitch > 230 && volume > 0.6 && speed > 150) {
    return 'cool';
  }

  // 怖い（震え・小声）
  if (pitch < 190 && volume < 0.4) {
    return 'scary';
  }

  // 急ぎ（速い・強い）
  if (speed > 180 && volume > 0.7) {
    return 'urgent';
  }

  // 感動（ゆっくり・深い）
  if (speed < 120 && pitch < 200 && volume > 0.5) {
    return 'impressive';
  }

  // 問題（重い・低い）
  if (pitch < 180 && speed < 130) {
    return 'problematic';
  }

  // ワクワク（弾む・高い）
  if (pitch > 240 && voiceFeatures.pitchVariation > 40) {
    return 'exciting';
  }

  // リスク（慎重・抑えた）
  if (volume < 0.5 && speed < 140) {
    return 'risky';
  }

  // 素晴らしい（明るい・伸びやか）
  if (pitch > 220 && volume > 0.6 && speed > 140 && speed < 170) {
    return 'wonderful';
  }

  // 難しい（ため息・遅い）
  if (speed < 110 && volume < 0.5) {
    return 'difficult';
  }

  // 驚き（急・高い）
  if (pitch > 260 && speed > 170) {
    return 'surprising';
  }

  return 'neutral';
}

/**
 * 微細音を分類
 */
export function classifyMicrosound(text: string, voiceFeatures: VoiceFeatures): MicrosoundType | null {
  const { pitch, volume, speed, pitchVariation } = voiceFeatures;

  // 「あ…」系
  if (text.match(/^あ[…。、]*$/)) {
    if (pitchVariation > 30 && pitch > 220) {
      return 'ah_realization'; // 気づき
    }
    if (volume < 0.4 && speed < 100) {
      return 'ah_confusion'; // 困惑
    }
    if (pitch > 240 && volume < 0.5) {
      return 'ah_tension'; // 緊張
    }
    if (pitch < 200 && volume < 0.5 && speed < 120) {
      return 'ah_relief'; // 安堵
    }
  }

  // 「えっ」系
  if (text.match(/^えっ[！？。、]*$/)) {
    if (pitch > 250 && volume > 0.6) {
      return 'eh_surprise'; // 驚き
    }
    if (pitch > 220 && pitchVariation > 35) {
      return 'eh_doubt'; // 疑問
    }
  }

  // 「は？」系
  if (text.match(/^は[？！。、]*$/)) {
    if (pitchVariation > 40) {
      return 'ha_question'; // 疑問
    }
    if (volume > 0.7 && pitch < 200) {
      return 'ha_anger'; // 怒り
    }
    if (volume < 0.5 && speed < 120) {
      return 'ha_confusion'; // 混乱
    }
  }

  // 「うん」系
  if (text.match(/^うん[。、]*$/)) {
    if (pitch > 200 && volume > 0.5 && speed > 140) {
      return 'un_agreement'; // 同意
    }
    if (speed < 120 && volume < 0.5) {
      return 'un_thinking'; // 考え中
    }
  }

  // 「ん」系
  if (text.match(/^ん[。、]*$/)) {
    if (pitch < 200 && volume > 0.5) {
      return 'mm_understanding'; // 理解
    }
    if (pitch > 220 && pitchVariation > 30) {
      return 'mm_doubt'; // 疑問
    }
  }

  return null;
}

/**
 * 火水変調を計算
 */
export function calculateFireWaterModulation(
  text: string,
  voiceFeatures: VoiceFeatures
): FireWaterModulation {
  // テキストから火水バランスを計算
  const textFireWater = calculateFireWaterBalance(text);

  // 音声特徴から火水バランスを計算
  const voiceFireWater = calculateVoiceFireWater(voiceFeatures);

  // 統合
  const fire = Math.round(textFireWater.fire * 0.4 + voiceFireWater.fire * 0.6);
  const water = Math.round(textFireWater.water * 0.4 + voiceFireWater.water * 0.6);

  // 変調タイプを判定
  let modulationType: FireWaterModulation['modulationType'];
  const difference = Math.abs(fire - water);
  if (fire > water + 20) {
    modulationType = 'fire_dominant';
  } else if (water > fire + 20) {
    modulationType = 'water_dominant';
  } else if (difference < 10) {
    modulationType = 'balanced';
  } else {
    modulationType = 'unstable';
  }

  // 変調強度を計算
  const modulationIntensity = Math.min(1, difference / 100);

  return {
    fire,
    water,
    modulationType,
    modulationIntensity,
  };
}

/**
 * 音声特徴から火水バランスを計算
 */
function calculateVoiceFireWater(voiceFeatures: VoiceFeatures): { fire: number; water: number } {
  let fire = 50;
  let water = 50;

  // ピッチから判定
  if (voiceFeatures.pitch > 220) {
    fire += 15;
  } else if (voiceFeatures.pitch < 180) {
    water += 15;
  }

  // ボリュームから判定
  if (voiceFeatures.volume > 0.7) {
    fire += 20;
  } else if (voiceFeatures.volume < 0.4) {
    water += 15;
  }

  // スピードから判定
  if (voiceFeatures.speed > 170) {
    fire += 15;
  } else if (voiceFeatures.speed < 130) {
    water += 15;
  }

  // 正規化
  const total = fire + water;
  fire = Math.round((fire / total) * 100);
  water = Math.round((water / total) * 100);

  return { fire, water };
}

/**
 * ミナカ判断（声の中心・偏り・波形の響き）
 */
export function judgeMinaka(voiceFeatures: VoiceFeatures): MinakaJudgment {
  // 声の中心（理想的なピッチ: 200Hz）
  const idealPitch = 200;
  const voiceCenter = voiceFeatures.pitch;

  // 声の偏り
  const voiceBias = (voiceCenter - idealPitch) / idealPitch;

  // 波形の響き（ピッチ変動とボリューム変動から計算）
  const waveformResonance = Math.min(1, (voiceFeatures.pitchVariation / 50 + voiceFeatures.volumeVariation) / 2);

  // 中心からのズレ
  const centerDeviation = Math.min(100, Math.abs(voiceCenter - idealPitch) / idealPitch * 100);

  // 調和度（中心に近く、変動が適度な場合に高い）
  const harmonyLevel = Math.max(0, 100 - centerDeviation - Math.abs(voiceFeatures.pitchVariation - 30) * 2);

  return {
    voiceCenter,
    voiceBias,
    waveformResonance,
    centerDeviation,
    harmonyLevel,
  };
}

/**
 * Soul Sync連動解釈
 */
export function interpretWithSoulSync(
  voiceContext: VoiceContextAnalysis,
  minakaJudgment: MinakaJudgment
): {
  soulResonance: number;
  recommendedResponseMode: 'calm_down' | 'encourage' | 'empathize' | 'energize' | 'comfort' | 'motivate' | 'neutral';
} {
  // 魂との共鳴度（調和度とエネルギーレベルから計算）
  const soulResonance = Math.round(
    (minakaJudgment.harmonyLevel * 0.6 + voiceContext.energyLevel * 0.4)
  );

  // 推奨応答モードを判定
  let recommendedResponseMode: DeepUnderstandingResult['soulSyncInterpretation']['recommendedResponseMode'] = 'neutral';

  if (voiceContext.stressLevel > 70) {
    recommendedResponseMode = 'calm_down';
  } else if (voiceContext.energyLevel < 30) {
    recommendedResponseMode = 'energize';
  } else if (voiceContext.emotionTone === 'sadness') {
    recommendedResponseMode = 'comfort';
  } else if (voiceContext.emotionTone === 'anxiety') {
    recommendedResponseMode = 'empathize';
  } else if (voiceContext.speakingStyle.confident === false && voiceContext.hesitationLevel === 'high') {
    recommendedResponseMode = 'encourage';
  } else if (voiceContext.emotionTone === 'joy' || voiceContext.emotionTone === 'excitement') {
    recommendedResponseMode = 'motivate';
  }

  return {
    soulResonance,
    recommendedResponseMode,
  };
}

/**
 * 深層理解を実行
 */
export function performDeepUnderstanding(
  text: string,
  voiceFeatures: VoiceFeatures
): DeepUnderstandingResult {
  // 音声文脈分析
  const voiceContext = analyzeVoiceContext(voiceFeatures, text);

  // 「やばい」分類
  const yabaiType = classifyYabai(text, voiceFeatures);

  // 微細音分類
  const microsoundType = classifyMicrosound(text, voiceFeatures);

  // 火水変調
  const fireWaterModulation = calculateFireWaterModulation(text, voiceFeatures);

  // ミナカ判断
  const minakaJudgment = judgeMinaka(voiceFeatures);

  // Soul Sync連動解釈
  const soulSyncInterpretation = interpretWithSoulSync(voiceContext, minakaJudgment);

  return {
    originalText: text,
    voiceFeatures,
    voiceContext,
    yabaiType: yabaiType !== 'neutral' ? yabaiType : undefined,
    microsoundType: microsoundType || undefined,
    fireWaterModulation,
    minakaJudgment,
    soulSyncInterpretation,
  };
}

/**
 * 五十音×音素マッピング（基本50音）
 */
export const GOJUON_PHONEME_MAPPING: GojuonPhonemeMapping[] = [
  // あ行
  { gojuon: 'あ', phoneme: 'a', fireWater: 'fire', spiritualScore: 95 },
  { gojuon: 'い', phoneme: 'i', fireWater: 'fire', spiritualScore: 85 },
  { gojuon: 'う', phoneme: 'ɯ', fireWater: 'water', spiritualScore: 80 },
  { gojuon: 'え', phoneme: 'e', fireWater: 'balanced', spiritualScore: 75 },
  { gojuon: 'お', phoneme: 'o', fireWater: 'water', spiritualScore: 90 },
  
  // か行
  { gojuon: 'か', phoneme: 'ka', fireWater: 'fire', spiritualScore: 70 },
  { gojuon: 'き', phoneme: 'ki', fireWater: 'fire', spiritualScore: 85 },
  { gojuon: 'く', phoneme: 'kɯ', fireWater: 'water', spiritualScore: 65 },
  { gojuon: 'け', phoneme: 'ke', fireWater: 'balanced', spiritualScore: 60 },
  { gojuon: 'こ', phoneme: 'ko', fireWater: 'water', spiritualScore: 75 },
  
  // さ行
  { gojuon: 'さ', phoneme: 'sa', fireWater: 'fire', spiritualScore: 65 },
  { gojuon: 'し', phoneme: 'ɕi', fireWater: 'fire', spiritualScore: 80 },
  { gojuon: 'す', phoneme: 'sɯ', fireWater: 'water', spiritualScore: 70 },
  { gojuon: 'せ', phoneme: 'se', fireWater: 'balanced', spiritualScore: 65 },
  { gojuon: 'そ', phoneme: 'so', fireWater: 'water', spiritualScore: 70 },
  
  // た行
  { gojuon: 'た', phoneme: 'ta', fireWater: 'fire', spiritualScore: 75 },
  { gojuon: 'ち', phoneme: 'tɕi', fireWater: 'fire', spiritualScore: 70 },
  { gojuon: 'つ', phoneme: 'tsɯ', fireWater: 'water', spiritualScore: 65 },
  { gojuon: 'て', phoneme: 'te', fireWater: 'balanced', spiritualScore: 70 },
  { gojuon: 'と', phoneme: 'to', fireWater: 'water', spiritualScore: 75 },
  
  // な行
  { gojuon: 'な', phoneme: 'na', fireWater: 'balanced', spiritualScore: 80 },
  { gojuon: 'に', phoneme: 'ɲi', fireWater: 'fire', spiritualScore: 75 },
  { gojuon: 'ぬ', phoneme: 'nɯ', fireWater: 'water', spiritualScore: 70 },
  { gojuon: 'ね', phoneme: 'ne', fireWater: 'balanced', spiritualScore: 75 },
  { gojuon: 'の', phoneme: 'no', fireWater: 'water', spiritualScore: 80 },
  
  // は行
  { gojuon: 'は', phoneme: 'ha', fireWater: 'fire', spiritualScore: 85 },
  { gojuon: 'ひ', phoneme: 'çi', fireWater: 'fire', spiritualScore: 90 },
  { gojuon: 'ふ', phoneme: 'ɸɯ', fireWater: 'water', spiritualScore: 75 },
  { gojuon: 'へ', phoneme: 'he', fireWater: 'balanced', spiritualScore: 70 },
  { gojuon: 'ほ', phoneme: 'ho', fireWater: 'water', spiritualScore: 80 },
  
  // ま行
  { gojuon: 'ま', phoneme: 'ma', fireWater: 'balanced', spiritualScore: 85 },
  { gojuon: 'み', phoneme: 'mi', fireWater: 'water', spiritualScore: 90 },
  { gojuon: 'む', phoneme: 'mɯ', fireWater: 'water', spiritualScore: 80 },
  { gojuon: 'め', phoneme: 'me', fireWater: 'balanced', spiritualScore: 75 },
  { gojuon: 'も', phoneme: 'mo', fireWater: 'water', spiritualScore: 85 },
  
  // や行
  { gojuon: 'や', phoneme: 'ja', fireWater: 'fire', spiritualScore: 80 },
  { gojuon: 'ゆ', phoneme: 'jɯ', fireWater: 'water', spiritualScore: 85 },
  { gojuon: 'よ', phoneme: 'jo', fireWater: 'water', spiritualScore: 80 },
  
  // ら行
  { gojuon: 'ら', phoneme: 'ɾa', fireWater: 'fire', spiritualScore: 70 },
  { gojuon: 'り', phoneme: 'ɾi', fireWater: 'fire', spiritualScore: 75 },
  { gojuon: 'る', phoneme: 'ɾɯ', fireWater: 'water', spiritualScore: 70 },
  { gojuon: 'れ', phoneme: 'ɾe', fireWater: 'balanced', spiritualScore: 65 },
  { gojuon: 'ろ', phoneme: 'ɾo', fireWater: 'water', spiritualScore: 70 },
  
  // わ行
  { gojuon: 'わ', phoneme: 'wa', fireWater: 'water', spiritualScore: 95 },
  { gojuon: 'を', phoneme: 'wo', fireWater: 'water', spiritualScore: 90 },
  { gojuon: 'ん', phoneme: 'ɴ', fireWater: 'balanced', spiritualScore: 100 },
];
