/**
 * Natural Conversation Flow Engine
 * 自然会話フロー制御エンジン
 * 
 * 機能:
 * - 人間の自然会話の間（ま）
 * - 相槌（うん、なるほど、そうなんですね）
 * - 感情に合わせた反応
 * - 違和感の無い会話テンポ
 * - 会話の間に呼吸音・小さな反応
 */

/**
 * 会話ターン
 */
export interface ConversationTurn {
  /** 話者 */
  speaker: 'user' | 'assistant';
  /** 発話内容 */
  utterance: string;
  /** 発話開始時刻 */
  startTime: number;
  /** 発話終了時刻 */
  endTime: number;
  /** 感情トーン */
  emotionTone?: 'joy' | 'anger' | 'sadness' | 'calm' | 'excitement' | 'neutral' | 'anxiety' | 'confusion';
  /** 発話速度（wpm） */
  speechRate?: number;
  /** ボリューム（0-1） */
  volume?: number;
}

/**
 * 相槌タイプ
 */
export type BackchannelType =
  | 'agreement'      // 同意（うん、そうですね）
  | 'understanding'  // 理解（なるほど、わかります）
  | 'empathy'        // 共感（そうなんですね、大変でしたね）
  | 'surprise'       // 驚き（えっ、本当ですか）
  | 'encouragement'  // 励まし（頑張ってください、応援しています）
  | 'thinking'       // 考え中（うーん、そうですね）
  | 'minimal';       // 最小限（うん、はい）

/**
 * 相槌
 */
export interface Backchannel {
  /** 相槌タイプ */
  type: BackchannelType;
  /** 相槌テキスト */
  text: string;
  /** 挿入タイミング（ミリ秒） */
  timing: number;
  /** 長さ（ミリ秒） */
  duration: number;
}

/**
 * 呼吸音
 */
export interface BreathSound {
  /** 呼吸タイプ */
  type: 'inhale' | 'exhale' | 'sigh';
  /** 挿入タイミング（ミリ秒） */
  timing: number;
  /** 長さ（ミリ秒） */
  duration: number;
  /** 音量（0-1） */
  volume: number;
}

/**
 * 会話テンポ
 */
export interface ConversationTempo {
  /** 平均発話速度（wpm） */
  averageSpeechRate: number;
  /** 平均ポーズ長（ミリ秒） */
  averagePauseDuration: number;
  /** ターン交代速度（ミリ秒） */
  turnTakingSpeed: number;
  /** 会話リズム（fast/moderate/slow） */
  rhythm: 'fast' | 'moderate' | 'slow';
}

/**
 * 会話履歴から会話テンポを分析
 */
export function analyzeConversationTempo(turns: ConversationTurn[]): ConversationTempo {
  if (turns.length === 0) {
    return {
      averageSpeechRate: 150,
      averagePauseDuration: 500,
      turnTakingSpeed: 300,
      rhythm: 'moderate',
    };
  }

  // 発話速度の計算
  const speechRates = turns
    .filter(t => t.speechRate)
    .map(t => t.speechRate!);
  const averageSpeechRate = speechRates.length > 0
    ? speechRates.reduce((sum, rate) => sum + rate, 0) / speechRates.length
    : 150;

  // ポーズ長の計算
  const pauseDurations: number[] = [];
  for (let i = 1; i < turns.length; i++) {
    const pause = turns[i].startTime - turns[i - 1].endTime;
    if (pause > 0) {
      pauseDurations.push(pause);
    }
  }
  const averagePauseDuration = pauseDurations.length > 0
    ? pauseDurations.reduce((sum, dur) => sum + dur, 0) / pauseDurations.length
    : 500;

  // ターン交代速度の計算
  const turnTakingSpeeds: number[] = [];
  for (let i = 1; i < turns.length; i++) {
    if (turns[i].speaker !== turns[i - 1].speaker) {
      const speed = turns[i].startTime - turns[i - 1].endTime;
      turnTakingSpeeds.push(speed);
    }
  }
  const turnTakingSpeed = turnTakingSpeeds.length > 0
    ? turnTakingSpeeds.reduce((sum, speed) => sum + speed, 0) / turnTakingSpeeds.length
    : 300;

  // 会話リズムの判定
  let rhythm: 'fast' | 'moderate' | 'slow';
  if (averageSpeechRate > 180 && turnTakingSpeed < 200) {
    rhythm = 'fast';
  } else if (averageSpeechRate < 120 || turnTakingSpeed > 500) {
    rhythm = 'slow';
  } else {
    rhythm = 'moderate';
  }

  return {
    averageSpeechRate,
    averagePauseDuration,
    turnTakingSpeed,
    rhythm,
  };
}

/**
 * 相槌を生成
 */
export function generateBackchannel(
  userUtterance: string,
  emotionTone: string,
  conversationContext: string[]
): Backchannel | null {
  // 相槌が必要かどうかを判定
  const needsBackchannel = shouldInsertBackchannel(userUtterance, conversationContext);
  if (!needsBackchannel) {
    return null;
  }

  // 相槌タイプを判定
  const type = determineBackchannelType(userUtterance, emotionTone);

  // 相槌テキストを生成
  const text = selectBackchannelText(type, emotionTone);

  // タイミングと長さを計算
  const timing = calculateBackchannelTiming(userUtterance);
  const duration = text.length * 100 + 200; // 文字数 × 100ms + 200ms

  return {
    type,
    text,
    timing,
    duration,
  };
}

/**
 * 相槌が必要かどうかを判定
 */
function shouldInsertBackchannel(utterance: string, context: string[]): boolean {
  // 長い発話には相槌を入れる
  if (utterance.length > 50) {
    return true;
  }

  // 感情的な発話には相槌を入れる
  const emotionalKeywords = ['嬉しい', '悲しい', '辛い', '楽しい', '困った', '大変'];
  if (emotionalKeywords.some(keyword => utterance.includes(keyword))) {
    return true;
  }

  // 質問には相槌を入れない
  if (utterance.endsWith('？') || utterance.endsWith('?')) {
    return false;
  }

  // 短い発話には相槌を入れない
  if (utterance.length < 10) {
    return false;
  }

  // 連続した相槌は避ける
  if (context.length > 0 && context[context.length - 1].length < 5) {
    return false;
  }

  return Math.random() > 0.6; // 40%の確率で相槌を入れる
}

/**
 * 相槌タイプを判定
 */
function determineBackchannelType(utterance: string, emotionTone: string): BackchannelType {
  // 感情トーンから判定
  if (emotionTone === 'sadness' || emotionTone === 'anxiety') {
    return 'empathy';
  }
  if (emotionTone === 'joy' || emotionTone === 'excitement') {
    return 'agreement';
  }

  // 発話内容から判定
  if (utterance.includes('わかりました') || utterance.includes('理解しました')) {
    return 'understanding';
  }
  if (utterance.includes('驚いた') || utterance.includes('びっくり')) {
    return 'surprise';
  }
  if (utterance.includes('頑張') || utterance.includes('挑戦')) {
    return 'encouragement';
  }
  if (utterance.includes('どうしよう') || utterance.includes('悩んで')) {
    return 'thinking';
  }

  // デフォルトは理解
  return 'understanding';
}

/**
 * 相槌テキストを選択
 */
function selectBackchannelText(type: BackchannelType, emotionTone: string): string {
  const backchannelTexts: Record<BackchannelType, string[]> = {
    agreement: ['うん', 'そうですね', 'そうだね', 'その通りです'],
    understanding: ['なるほど', 'わかります', 'そういうことですね', 'なるほどね'],
    empathy: ['そうなんですね', '大変でしたね', 'お気持ちわかります', 'そうだったんですね'],
    surprise: ['えっ', '本当ですか', 'そうなんですか', 'へえ'],
    encouragement: ['頑張ってください', '応援しています', 'きっとうまくいきますよ', 'できますよ'],
    thinking: ['うーん', 'そうですね', 'なるほど', 'ふむふむ'],
    minimal: ['うん', 'はい', 'ええ', 'そう'],
  };

  const texts = backchannelTexts[type];
  return texts[Math.floor(Math.random() * texts.length)];
}

/**
 * 相槌のタイミングを計算
 */
function calculateBackchannelTiming(utterance: string): number {
  // 発話の中間あたりに相槌を入れる
  const estimatedDuration = utterance.length * 100; // 1文字100ms
  return estimatedDuration * 0.6; // 60%の位置
}

/**
 * 呼吸音を生成
 */
export function generateBreathSounds(
  utteranceDuration: number,
  emotionTone: string,
  speechRate: number
): BreathSound[] {
  const breathSounds: BreathSound[] = [];

  // 発話前の息継ぎ
  breathSounds.push({
    type: 'inhale',
    timing: -200, // 発話の200ms前
    duration: 150,
    volume: 0.3,
  });

  // 長い発話の場合、途中に息継ぎを入れる
  if (utteranceDuration > 5000) {
    const numBreaths = Math.floor(utteranceDuration / 5000);
    for (let i = 1; i <= numBreaths; i++) {
      breathSounds.push({
        type: 'inhale',
        timing: (utteranceDuration / (numBreaths + 1)) * i,
        duration: 100,
        volume: 0.2,
      });
    }
  }

  // 感情に応じた呼吸音
  if (emotionTone === 'sadness' || emotionTone === 'anxiety') {
    // ため息
    breathSounds.push({
      type: 'sigh',
      timing: utteranceDuration + 300,
      duration: 400,
      volume: 0.4,
    });
  }

  return breathSounds;
}

/**
 * 会話テンポに合わせてポーズを調整
 */
export function adjustPauseDuration(
  basePauseDuration: number,
  conversationTempo: ConversationTempo,
  emotionTone: string
): number {
  let adjustedPause = basePauseDuration;

  // 会話リズムに合わせて調整
  if (conversationTempo.rhythm === 'fast') {
    adjustedPause *= 0.7; // 30%短く
  } else if (conversationTempo.rhythm === 'slow') {
    adjustedPause *= 1.3; // 30%長く
  }

  // 感情に合わせて調整
  if (emotionTone === 'excitement') {
    adjustedPause *= 0.8; // 20%短く
  } else if (emotionTone === 'sadness' || emotionTone === 'anxiety') {
    adjustedPause *= 1.2; // 20%長く
  }

  return Math.max(100, Math.min(2000, adjustedPause)); // 100ms〜2000msの範囲
}

/**
 * 自然な会話フローを生成
 */
export function generateNaturalConversationFlow(
  userUtterance: string,
  assistantResponse: string,
  conversationHistory: ConversationTurn[],
  options: {
    emotionTone?: string;
    speechRate?: number;
  } = {}
): {
  backchannel: Backchannel | null;
  breathSounds: BreathSound[];
  pauseDuration: number;
  responseDelay: number;
} {
  const emotionTone = options.emotionTone || 'neutral';
  const speechRate = options.speechRate || 150;

  // 会話テンポを分析
  const conversationTempo = analyzeConversationTempo(conversationHistory);

  // 相槌を生成
  const backchannel = generateBackchannel(
    userUtterance,
    emotionTone,
    conversationHistory.map(t => t.utterance)
  );

  // 呼吸音を生成
  const estimatedDuration = assistantResponse.length * (60000 / speechRate / 5); // 5文字/単語と仮定
  const breathSounds = generateBreathSounds(estimatedDuration, emotionTone, speechRate);

  // ポーズ長を調整
  const basePauseDuration = 500;
  const pauseDuration = adjustPauseDuration(basePauseDuration, conversationTempo, emotionTone);

  // 応答遅延を計算（自然な反応時間）
  const responseDelay = calculateResponseDelay(userUtterance, emotionTone, conversationTempo);

  return {
    backchannel,
    breathSounds,
    pauseDuration,
    responseDelay,
  };
}

/**
 * 応答遅延を計算
 */
function calculateResponseDelay(
  userUtterance: string,
  emotionTone: string,
  conversationTempo: ConversationTempo
): number {
  // 基本遅延
  let delay = conversationTempo.turnTakingSpeed;

  // 発話の長さに応じて調整
  if (userUtterance.length > 100) {
    delay += 200; // 長い発話には少し考える時間
  }

  // 感情に応じて調整
  if (emotionTone === 'anxiety' || emotionTone === 'confusion') {
    delay += 300; // 不安や混乱には慎重に
  } else if (emotionTone === 'excitement') {
    delay -= 100; // 興奮には素早く
  }

  return Math.max(200, Math.min(1000, delay)); // 200ms〜1000msの範囲
}
