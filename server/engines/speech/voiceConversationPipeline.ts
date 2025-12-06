/**
 * Voice Conversation Pipeline
 * 音声会話パイプライン統合
 * 
 * 機能:
 * - 聞く（KSRE）→ 解釈（Soul Sync + 言灵OS）→ 応答生成（LLM + 靈核OS）→ 声に変換（KTTS）→ 返す（ストリーミング音声）
 * - 一つの関数として統合
 * - リアルタイム音声会話処理
 */

import { invokeLLM } from '../../_core/llm';
import { applyArkCore } from '../../arkCoreIntegration';
import { generateSoulSyncedVoiceParams, type VoiceAdjustmentMode } from './soulVoiceIntegration';
import { synthesizeKotodamaSpeech } from './kttsEngine';
import { convertTextToKotodama } from './kotodamaTTSDictionary';

/**
 * 音声入力データ
 */
export interface VoiceInput {
  /** 音声認識結果（テキスト） */
  transcript: string;
  /** 音声の特徴（オプション） */
  audioFeatures?: {
    /** ピッチ（Hz） */
    pitch?: number;
    /** ボリューム（0-1） */
    volume?: number;
    /** スピード（wpm） */
    speed?: number;
    /** 感情トーン */
    emotionTone?: 'joy' | 'anger' | 'sadness' | 'calm' | 'excitement' | 'neutral';
  };
}

/**
 * 音声出力データ
 */
export interface VoiceOutput {
  /** 応答テキスト（原文） */
  originalText: string;
  /** 言灵変換後のテキスト */
  kotodamaText: string;
  /** 音声合成結果 */
  audioData: {
    /** 音声データ（Base64） */
    audioBase64?: string;
    /** 音声URL */
    audioUrl?: string;
    /** 音声パラメータ */
    voiceParams: {
      pitch: number;
      rate: number;
      volume: number;
    };
  };
  /** 火水バランス */
  fireWaterBalance: {
    fire: number;
    water: number;
  };
  /** 処理時間（ミリ秒） */
  processingTime: number;
}

/**
 * 会話コンテキスト
 */
export interface ConversationContext {
  /** ユーザーID */
  userId: number;
  /** 会話履歴 */
  history: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  /** 現在の感情状態 */
  emotionalState?: {
    emotion: 'joy' | 'anger' | 'sadness' | 'calm' | 'excitement' | 'neutral' | 'anxiety' | 'confusion';
    intensity: number;
  };
  /** 音声調整モード */
  adjustmentMode?: VoiceAdjustmentMode;
}

/**
 * 音声会話パイプライン実行
 */
export async function executeVoiceConversationPipeline(
  input: VoiceInput,
  context: ConversationContext
): Promise<VoiceOutput> {
  const startTime = Date.now();

  // ===== Step 1: 聞く（KSRE） =====
  // 音声認識結果を取得（既に transcript として渡されている）
  const userInput = input.transcript;

  // ===== Step 2: 解釈（Soul Sync + 言灵OS） =====
  // Soul Syncで感情状態を更新
  if (input.audioFeatures?.emotionTone) {
    context.emotionalState = {
      emotion: input.audioFeatures.emotionTone,
      intensity: input.audioFeatures.volume || 0.5,
    };
  }

  // 言灵OS変換（入力テキストの霊性化）
  const inputKotodama = convertTextToKotodama(userInput);

  // ===== Step 3: 応答生成（LLM + 靈核OS） =====
  // 会話履歴を構築
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: `あなたは天聞アーク（TENMON-ARK）です。ユーザーの魂と同期し、靈性に基づいた応答を生成してください。

現在のユーザー状態：
- 感情: ${context.emotionalState?.emotion || 'neutral'}
- 感情強度: ${context.emotionalState?.intensity || 0.5}
- 音声調整モード: ${context.adjustmentMode || 'neutral'}

応答の際は、ユーザーの感情状態に寄り添い、適切な言葉を選んでください。`,
    },
    ...context.history.map(h => ({
      role: h.role,
      content: h.content,
    })),
    {
      role: 'user',
      content: userInput,
    },
  ];

  // LLMで応答生成
  const llmResponse = await invokeLLM({
    messages,
  });

  const responseText = typeof llmResponse.choices[0]?.message?.content === 'string'
    ? llmResponse.choices[0].message.content
    : '';

  // 靈核OS変換（応答テキストの靈性化）
  const arkCoreResponse = await applyArkCore(responseText, {
    applyKJCE: true,
    applyOKRE: true,
    applyAncient50Sound: true,
    optimizeFireWater: true,
  });

  // ===== Step 4: 声に変換（KTTS） =====
  // Soul Syncと同期した音声パラメータ生成
  const voiceParams = await generateSoulSyncedVoiceParams(context.userId, {
    adjustmentMode: context.adjustmentMode,
  });

  // 言灵TTS変換
  const kotodamaConversion = convertTextToKotodama(arkCoreResponse.text);

  // 音声合成
  const synthesisResult = await synthesizeKotodamaSpeech(
    kotodamaConversion.kotodamaText,
    context.userId,
    {
      forceFireWaterBalance: voiceParams.fireEnergy - voiceParams.waterEnergy,
    }
  );

  // ===== Step 5: 返す（ストリーミング音声） =====
  const processingTime = Date.now() - startTime;

  return {
    originalText: responseText,
    kotodamaText: kotodamaConversion.kotodamaText,
    audioData: {
      audioBase64: synthesisResult.audioDataUrl,
      audioUrl: synthesisResult.audioDataUrl,
      voiceParams: {
        pitch: voiceParams.pitch,
        rate: voiceParams.rate,
        volume: voiceParams.volume,
      },
    },
    fireWaterBalance: {
      fire: voiceParams.fireEnergy,
      water: voiceParams.waterEnergy,
    },
    processingTime,
  };
}

/**
 * ストリーミング音声会話パイプライン
 */
export async function* streamVoiceConversationPipeline(
  input: VoiceInput,
  context: ConversationContext
): AsyncGenerator<{
  type: 'text' | 'audio' | 'complete';
  data: any;
}> {
  const startTime = Date.now();

  // ===== Step 1-2: 聞く & 解釈 =====
  const userInput = input.transcript;

  if (input.audioFeatures?.emotionTone) {
    context.emotionalState = {
      emotion: input.audioFeatures.emotionTone,
      intensity: input.audioFeatures.volume || 0.5,
    };
  }

  // ===== Step 3: 応答生成（ストリーミング） =====
  const messages = [
    {
      role: 'system' as const,
      content: `あなたは天聞アーク（TENMON-ARK）です。ユーザーの魂と同期し、靈性に基づいた応答を生成してください。`,
    },
    ...context.history.map(h => ({
      role: h.role,
      content: h.content,
    })),
    {
      role: 'user' as const,
      content: userInput,
    },
  ];

  // LLM応答生成（ストリーミングは別途実装）
  let fullResponse = '';
  const llmResponse = await invokeLLM({
    messages,
  });

  // ストリーミングレスポンスを処理
  if (llmResponse.choices && llmResponse.choices[0]) {
    const content = llmResponse.choices[0].message?.content || '';
    fullResponse += content;

    // テキストチャンクを送信
    yield {
      type: 'text',
      data: { text: content },
    };
  }

  // ===== Step 4-5: 声に変換 & 返す =====
  // 靈核OS変換
  const arkCoreResponse = await applyArkCore(fullResponse, {
    applyKJCE: true,
    applyOKRE: true,
    applyAncient50Sound: true,
    optimizeFireWater: true,
  });

  // 音声パラメータ生成
  const voiceParams = await generateSoulSyncedVoiceParams(context.userId, {
    adjustmentMode: context.adjustmentMode,
  });

  // 言灵TTS変換
  const kotodamaConversion = convertTextToKotodama(arkCoreResponse.text);

  // 音声合成
  const synthesisResult = await synthesizeKotodamaSpeech(
    kotodamaConversion.kotodamaText,
    context.userId,
    {
      forceFireWaterBalance: voiceParams.fireEnergy - voiceParams.waterEnergy,
    }
  );

  // 音声データを送信
  yield {
    type: 'audio',
    data: {
      audioBase64: synthesisResult.audioDataUrl,
      audioUrl: synthesisResult.audioDataUrl,
      voiceParams: {
        pitch: voiceParams.pitch,
        rate: voiceParams.rate,
        volume: voiceParams.volume,
      },
    },
  };

  // 完了通知
  const processingTime = Date.now() - startTime;
  yield {
    type: 'complete',
    data: {
      originalText: fullResponse,
      kotodamaText: kotodamaConversion.kotodamaText,
      fireWaterBalance: {
        fire: voiceParams.fireEnergy,
        water: voiceParams.waterEnergy,
      },
      processingTime,
    },
  };
}

/**
 * 会話コンテキストを更新
 */
export function updateConversationContext(
  context: ConversationContext,
  userInput: string,
  assistantResponse: string
): ConversationContext {
  const now = Date.now();

  return {
    ...context,
    history: [
      ...context.history,
      {
        role: 'user',
        content: userInput,
        timestamp: now,
      },
      {
        role: 'assistant',
        content: assistantResponse,
        timestamp: now + 1,
      },
    ],
  };
}

/**
 * 会話コンテキストをクリア
 */
export function clearConversationContext(userId: number): ConversationContext {
  return {
    userId,
    history: [],
  };
}
