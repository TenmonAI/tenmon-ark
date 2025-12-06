/**
 * KTTS (Kotodama Text-to-Speech Engine)
 * 
 * 言灵OS音声合成エンジン
 * - 火水ボイスエンジン（火=鋭い/明瞭、水=柔らかい/包む）
 * - 言灵TTS変換辞書（言霊→言灵、霊→靈、気→氣）
 * - 日本語の間・息・抑揚の完全実装
 * - Soul Sync × 音声人格統合
 * - 音声会話パイプライン（聞く→解析→言灵変換→人格同期→話す）
 */

import { calculateFireWaterBalance } from '../../kotodama/kotodamaJapaneseCorrectorEngine';
import { getSoulSyncStatus } from '../../soulSync/soulSyncEngine';

/**
 * 火水ボイスパラメータ
 */
export interface FireWaterVoiceParams {
  /** 火のエネルギー（0-100） */
  fireEnergy: number;
  /** 水のエネルギー（0-100） */
  waterEnergy: number;
  /** ピッチ（0.5-2.0、1.0が標準） */
  pitch: number;
  /** スピード（0.5-2.0、1.0が標準） */
  rate: number;
  /** ボリューム（0-1.0） */
  volume: number;
  /** 声質（sharp=鋭い、soft=柔らかい、balanced=バランス） */
  voiceQuality: 'sharp' | 'soft' | 'balanced';
}

/**
 * 言灵TTS変換結果
 */
export interface KotodamaTTSConversion {
  /** 元のテキスト */
  originalText: string;
  /** 言灵変換後のテキスト */
  kotodamaText: string;
  /** 読み仮名（ひらがな） */
  reading: string;
  /** 変換された箇所 */
  conversions: Array<{
    original: string;
    converted: string;
    position: number;
  }>;
}

/**
 * 日本語の間・息・抑揚パラメータ
 */
export interface JapaneseProsodyParams {
  /** 間（ま）の長さ（ミリ秒） */
  pauseDuration: number;
  /** 息継ぎ位置（文字インデックス） */
  breathPoints: number[];
  /** 抑揚パターン（pitch変化） */
  intonationPattern: Array<{
    position: number;
    pitchShift: number; // -1.0 ~ 1.0
  }>;
  /** 語尾の火水制御 */
  endingStyle: 'fire' | 'water' | 'neutral';
}

/**
 * Soul Sync音声人格パラメータ
 */
export interface SoulVoicePersonality {
  /** 魂特性（火/水、陽/陰、直感/思考、強気/弱気） */
  soulTraits: {
    fireWaterBalance: number; // -100(水) ~ 100(火)
    yinYangBalance: number; // -100(陰) ~ 100(陽)
    intuitionLogic: number; // -100(直感) ~ 100(論理)
    assertiveness: number; // -100(弱気) ~ 100(強気)
  };
  /** 心の状態（鎮める/励ます/寄り添う） */
  emotionalMode: 'calm' | 'encourage' | 'empathize' | 'neutral';
  /** 語尾スタイル（です/だよ/ね/ぞ 等） */
  endingParticle: 'desu' | 'dayo' | 'ne' | 'zo' | 'auto';
}

/**
 * KTTS音声合成結果
 */
export interface KTTSSynthesisResult {
  /** 音声データURL（base64） */
  audioDataUrl: string;
  /** 音声データ形式 */
  format: 'wav' | 'mp3' | 'ogg';
  /** 火水ボイスパラメータ */
  voiceParams: FireWaterVoiceParams;
  /** 言灵変換結果 */
  kotodamaConversion: KotodamaTTSConversion;
  /** 韻律パラメータ */
  prosody: JapaneseProsodyParams;
  /** Soul Sync人格パラメータ */
  soulPersonality: SoulVoicePersonality;
  /** 合成時間（ミリ秒） */
  synthesisTime: number;
}

/**
 * 言灵TTS変換辞書
 */
const KOTODAMA_TTS_DICTIONARY: Record<string, { kotodama: string; reading: string }> = {
  // 霊→靈
  '言霊': { kotodama: '言灵', reading: 'ことだま' },
  '霊': { kotodama: '靈', reading: 'れい' },
  '霊魂': { kotodama: '靈魂', reading: 'れいこん' },
  '霊性': { kotodama: '靈性', reading: 'れいせい' },
  '霊的': { kotodama: '靈的', reading: 'れいてき' },
  '霊核': { kotodama: '靈核', reading: 'れいかく' },
  '霊運': { kotodama: '靈運', reading: 'れいうん' },
  
  // 気→氣
  '気': { kotodama: '氣', reading: 'き' },
  '元気': { kotodama: '元氣', reading: 'げんき' },
  '気持ち': { kotodama: '氣持ち', reading: 'きもち' },
  '気分': { kotodama: '氣分', reading: 'きぶん' },
  '雰囲気': { kotodama: '雰囲氣', reading: 'ふんいき' },
  
  // その他の霊的漢字
  '神': { kotodama: '神', reading: 'かみ' },
  '魂': { kotodama: '魂', reading: 'たましい' },
  '心': { kotodama: '心', reading: 'こころ' },
  '天': { kotodama: '天', reading: 'てん' },
  '地': { kotodama: '地', reading: 'ち' },
  '火': { kotodama: '火', reading: 'ひ' },
  '水': { kotodama: '水', reading: 'みず' },
};

/**
 * テキストを言灵変換
 */
export function convertToKotodamaTTS(text: string): KotodamaTTSConversion {
  let kotodamaText = text;
  let reading = '';
  const conversions: Array<{ original: string; converted: string; position: number }> = [];

  // 辞書に基づいて変換
  for (const [original, { kotodama, reading: kanaReading }] of Object.entries(KOTODAMA_TTS_DICTIONARY)) {
    const regex = new RegExp(original, 'g');
    let match;
    while ((match = regex.exec(text)) !== null) {
      conversions.push({
        original,
        converted: kotodama,
        position: match.index,
      });
    }
    kotodamaText = kotodamaText.replace(regex, kotodama);
  }

  // 読み仮名生成（簡易版、実際はMeCab等の形態素解析が必要）
  reading = text; // TODO: 形態素解析による読み仮名生成

  return {
    originalText: text,
    kotodamaText,
    reading,
    conversions,
  };
}

/**
 * 火水バランスに基づいてボイスパラメータを計算
 */
export function calculateFireWaterVoiceParams(
  fireEnergy: number,
  waterEnergy: number
): FireWaterVoiceParams {
  // 火水バランスの正規化（-100 ~ 100）
  const balance = fireEnergy - waterEnergy;

  // ピッチ：火が強いほど高く、水が強いほど低く
  const pitch = 1.0 + (balance / 200); // 0.5 ~ 1.5

  // スピード：火が強いほど速く、水が強いほど遅く
  const rate = 1.0 + (balance / 300); // 0.67 ~ 1.33

  // ボリューム：火が強いほど大きく、水が強いほど小さく
  const volume = 0.7 + (balance / 500); // 0.5 ~ 0.9

  // 声質判定
  let voiceQuality: 'sharp' | 'soft' | 'balanced';
  if (balance > 30) {
    voiceQuality = 'sharp'; // 火が強い
  } else if (balance < -30) {
    voiceQuality = 'soft'; // 水が強い
  } else {
    voiceQuality = 'balanced'; // バランス
  }

  return {
    fireEnergy,
    waterEnergy,
    pitch: Math.max(0.5, Math.min(2.0, pitch)),
    rate: Math.max(0.5, Math.min(2.0, rate)),
    volume: Math.max(0.0, Math.min(1.0, volume)),
    voiceQuality,
  };
}

/**
 * 日本語の間・息・抑揚を解析
 */
export function analyzeJapaneseProsody(
  text: string,
  fireWaterBalance: number
): JapaneseProsodyParams {
  const breathPoints: number[] = [];
  const intonationPattern: Array<{ position: number; pitchShift: number }> = [];

  // 句読点で息継ぎ位置を判定
  const punctuationMarks = ['、', '。', '！', '？', '…', '─'];
  for (let i = 0; i < text.length; i++) {
    if (punctuationMarks.includes(text[i])) {
      breathPoints.push(i);
    }
  }

  // 抑揚パターン生成（文頭は高く、文末は低く）
  const sentenceLength = text.length;
  for (let i = 0; i < sentenceLength; i += Math.floor(sentenceLength / 5)) {
    const progress = i / sentenceLength;
    const pitchShift = 0.3 - progress * 0.6; // 0.3 → -0.3
    intonationPattern.push({ position: i, pitchShift });
  }

  // 間の長さ（火が強いほど短く、水が強いほど長く）
  const pauseDuration = 300 - fireWaterBalance * 2; // 100ms ~ 500ms

  // 語尾スタイル（火が強いほど断定的、水が強いほど柔らかく）
  let endingStyle: 'fire' | 'water' | 'neutral';
  if (fireWaterBalance > 30) {
    endingStyle = 'fire';
  } else if (fireWaterBalance < -30) {
    endingStyle = 'water';
  } else {
    endingStyle = 'neutral';
  }

  return {
    pauseDuration: Math.max(100, Math.min(500, pauseDuration)),
    breathPoints,
    intonationPattern,
    endingStyle,
  };
}

/**
 * Soul Sync音声人格パラメータを生成
 */
export async function generateSoulVoicePersonality(
  userId: number,
  emotionalMode: 'calm' | 'encourage' | 'empathize' | 'neutral' = 'neutral'
): Promise<SoulVoicePersonality> {
  // Soul Syncプロファイル取得
  const soulStatus = await getSoulSyncStatus(userId);

  // 魂特性を音声パラメータに変換
  const soulTraits = {
    fireWaterBalance: 0, // TODO: Soul Syncから火水バランス取得
    yinYangBalance: 0, // TODO: 陰陽バランス計算
    intuitionLogic: 0, // TODO: 直感/論理バランス計算
    assertiveness: 0, // TODO: 強気/弱気バランス計算
  };

  // 語尾スタイル自動判定
  let endingParticle: 'desu' | 'dayo' | 'ne' | 'zo' | 'auto' = 'auto';
  if (emotionalMode === 'calm') {
    endingParticle = 'desu'; // 丁寧
  } else if (emotionalMode === 'encourage') {
    endingParticle = 'dayo'; // 親しみ
  } else if (emotionalMode === 'empathize') {
    endingParticle = 'ne'; // 共感
  }

  return {
    soulTraits,
    emotionalMode,
    endingParticle,
  };
}

/**
 * KTTS音声合成（メイン関数）
 */
export async function synthesizeKotodamaSpeech(
  text: string,
  userId: number,
  options: {
    emotionalMode?: 'calm' | 'encourage' | 'empathize' | 'neutral';
    forceFireWaterBalance?: number;
  } = {}
): Promise<KTTSSynthesisResult> {
  const startTime = Date.now();

  // 1. 言灵変換
  const kotodamaConversion = convertToKotodamaTTS(text);

  // 2. 火水バランス計算
  const fireWaterAnalysis = calculateFireWaterBalance(kotodamaConversion.kotodamaText);
  const fireWaterBalance = options.forceFireWaterBalance ?? (fireWaterAnalysis.fire - fireWaterAnalysis.water);

  // 3. 火水ボイスパラメータ計算
  const voiceParams = calculateFireWaterVoiceParams(
    fireWaterAnalysis.fire,
    fireWaterAnalysis.water
  );

  // 4. 日本語韻律解析
  const prosody = analyzeJapaneseProsody(kotodamaConversion.kotodamaText, fireWaterBalance);

  // 5. Soul Sync音声人格生成
  const soulPersonality = await generateSoulVoicePersonality(userId, options.emotionalMode);

  // 6. 音声合成（Web Speech API / 外部TTS APIを使用）
  // TODO: 実際の音声合成実装（現在はダミー）
  const audioDataUrl = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

  const synthesisTime = Date.now() - startTime;

  return {
    audioDataUrl,
    format: 'wav',
    voiceParams,
    kotodamaConversion,
    prosody,
    soulPersonality,
    synthesisTime,
  };
}

/**
 * ストリーミングTTS（リアルタイム音声合成）
 */
export async function* synthesizeKotodamaSpeechStream(
  text: string,
  userId: number,
  options: {
    emotionalMode?: 'calm' | 'encourage' | 'empathize' | 'neutral';
    forceFireWaterBalance?: number;
  } = {}
): AsyncGenerator<{
  chunk: string;
  progress: number;
  voiceParams: FireWaterVoiceParams;
}> {
  // 文章を句読点で分割
  const sentences = text.split(/([。！？])/);
  const totalSentences = sentences.length;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    if (!sentence.trim()) continue;

    // 各文を音声合成
    const result = await synthesizeKotodamaSpeech(sentence, userId, options);

    yield {
      chunk: result.audioDataUrl,
      progress: (i + 1) / totalSentences,
      voiceParams: result.voiceParams,
    };
  }
}
