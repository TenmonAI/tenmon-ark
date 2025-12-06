/**
 * Japanese Prosody Engine
 * 日本語韻律エンジン
 * 
 * 機能:
 * - 間（ま）の検出と制御
 * - 息継ぎポイントの判定
 * - 抑揚パターンの生成
 * - 語尾の火水制御
 * - TPOに応じた語尾最適化
 */

/**
 * 韻律パラメータ
 */
export interface ProsodyParams {
  /** 間（ま）の長さ（ミリ秒） */
  pauseDuration: number;
  /** 息継ぎ位置（文字インデックス） */
  breathPoints: number[];
  /** 抑揚パターン */
  intonationPattern: IntonationPoint[];
  /** 語尾スタイル */
  endingStyle: 'fire' | 'water' | 'neutral';
  /** 語尾の種類 */
  endingType: 'desu' | 'dayo' | 'ne' | 'zo' | 'auto';
}

/**
 * 抑揚ポイント
 */
export interface IntonationPoint {
  /** 文字位置 */
  position: number;
  /** ピッチシフト（-1.0 ~ 1.0） */
  pitchShift: number;
  /** 強度（0-1） */
  intensity: number;
}

/**
 * 句読点の種類
 */
const PUNCTUATION_MARKS = {
  COMMA: '、',
  PERIOD: '。',
  EXCLAMATION: '！',
  QUESTION: '？',
  ELLIPSIS: '…',
  DASH: '─',
  COLON: '：',
  SEMICOLON: '；',
} as const;

/**
 * 間（ま）の長さマップ（ミリ秒）
 */
const PAUSE_DURATION_MAP: Record<string, number> = {
  [PUNCTUATION_MARKS.COMMA]: 300,
  [PUNCTUATION_MARKS.PERIOD]: 500,
  [PUNCTUATION_MARKS.EXCLAMATION]: 400,
  [PUNCTUATION_MARKS.QUESTION]: 450,
  [PUNCTUATION_MARKS.ELLIPSIS]: 600,
  [PUNCTUATION_MARKS.DASH]: 350,
  [PUNCTUATION_MARKS.COLON]: 250,
  [PUNCTUATION_MARKS.SEMICOLON]: 300,
};

/**
 * 息継ぎポイントを検出
 */
export function detectBreathPoints(text: string): number[] {
  const breathPoints: number[] = [];

  // 句読点で息継ぎ位置を判定
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (Object.values(PUNCTUATION_MARKS).includes(char as any)) {
      breathPoints.push(i);
    }
  }

  // 長い文章の場合、文節で息継ぎを追加
  if (text.length > 50) {
    // 助詞（は、が、を、に、で、と、から、まで、より）で息継ぎ
    const particles = ['は', 'が', 'を', 'に', 'で', 'と', 'から', 'まで', 'より'];
    for (let i = 0; i < text.length; i++) {
      if (particles.includes(text[i]) && !breathPoints.includes(i)) {
        breathPoints.push(i);
      }
    }
  }

  return breathPoints.sort((a, b) => a - b);
}

/**
 * 間（ま）の長さを計算
 */
export function calculatePauseDuration(
  punctuation: string,
  fireWaterBalance: number
): number {
  // 基準の間の長さ
  const baseDuration = PAUSE_DURATION_MAP[punctuation] || 300;

  // 火水バランスによる調整（火が強いほど短く、水が強いほど長く）
  const adjustment = -fireWaterBalance * 2; // -200 ~ 200ms

  return Math.max(100, Math.min(800, baseDuration + adjustment));
}

/**
 * 抑揚パターンを生成
 */
export function generateIntonationPattern(
  text: string,
  sentenceType: 'statement' | 'question' | 'exclamation' | 'neutral' = 'neutral'
): IntonationPoint[] {
  const pattern: IntonationPoint[] = [];
  const sentenceLength = text.length;

  // 文頭
  pattern.push({
    position: 0,
    pitchShift: 0.3, // 高めに開始
    intensity: 0.8,
  });

  // 文中
  const midPoints = Math.floor(sentenceLength / 3);
  for (let i = 1; i < 3; i++) {
    const position = midPoints * i;
    pattern.push({
      position,
      pitchShift: 0.1 - i * 0.1, // 徐々に下がる
      intensity: 0.7,
    });
  }

  // 文末
  let endPitchShift = -0.3; // 基本は下がる
  if (sentenceType === 'question') {
    endPitchShift = 0.4; // 疑問文は上がる
  } else if (sentenceType === 'exclamation') {
    endPitchShift = 0.2; // 感嘆文は少し上がる
  }

  pattern.push({
    position: sentenceLength - 1,
    pitchShift: endPitchShift,
    intensity: 0.9,
  });

  return pattern;
}

/**
 * 文の種類を判定
 */
export function detectSentenceType(text: string): 'statement' | 'question' | 'exclamation' | 'neutral' {
  if (text.includes('？') || text.includes('?')) {
    return 'question';
  } else if (text.includes('！') || text.includes('!')) {
    return 'exclamation';
  } else if (text.includes('。') || text.includes('.')) {
    return 'statement';
  }
  return 'neutral';
}

/**
 * 語尾スタイルを判定
 */
export function detectEndingStyle(
  text: string,
  fireWaterBalance: number
): 'fire' | 'water' | 'neutral' {
  // 火水バランスに基づく判定
  if (fireWaterBalance > 30) {
    return 'fire'; // 断定的
  } else if (fireWaterBalance < -30) {
    return 'water'; // 柔らかい
  }

  // 語尾の文字列から判定
  const endings = {
    fire: ['だ', 'である', 'ぞ', 'ぜ', 'よ'],
    water: ['です', 'ます', 'ね', 'わ', 'かしら'],
  };

  for (const [style, endingList] of Object.entries(endings)) {
    for (const ending of endingList) {
      if (text.endsWith(ending)) {
        return style as 'fire' | 'water';
      }
    }
  }

  return 'neutral';
}

/**
 * TPOに応じた語尾を最適化
 */
export function optimizeEnding(
  text: string,
  tpo: 'formal' | 'casual' | 'friendly' | 'professional' | 'intimate'
): string {
  const tpoEndingMap: Record<string, string[]> = {
    formal: ['です', 'ます', 'ございます'],
    casual: ['だよ', 'だね', 'じゃん'],
    friendly: ['ね', 'よ', 'ですよ'],
    professional: ['です', 'ます', 'でしょう'],
    intimate: ['ね', 'よね', 'だよね'],
  };

  const endings = tpoEndingMap[tpo] || ['です'];

  // 既存の語尾を検出
  const currentEnding = detectCurrentEnding(text);

  // TPOに合わない場合は置換
  if (currentEnding && !endings.includes(currentEnding)) {
    const newEnding = endings[0];
    return text.slice(0, -currentEnding.length) + newEnding;
  }

  return text;
}

/**
 * 現在の語尾を検出
 */
function detectCurrentEnding(text: string): string | null {
  const commonEndings = [
    'です', 'ます', 'ございます',
    'だ', 'である',
    'だよ', 'だね', 'じゃん',
    'ね', 'よ', 'ぞ', 'ぜ', 'わ', 'かしら',
  ];

  for (const ending of commonEndings) {
    if (text.endsWith(ending)) {
      return ending;
    }
  }

  return null;
}

/**
 * 日本語韻律パラメータを生成
 */
export function generateJapaneseProsody(
  text: string,
  options: {
    fireWaterBalance?: number;
    tpo?: 'formal' | 'casual' | 'friendly' | 'professional' | 'intimate';
    endingType?: 'desu' | 'dayo' | 'ne' | 'zo' | 'auto';
  } = {}
): ProsodyParams {
  const {
    fireWaterBalance = 0,
    tpo = 'casual',
    endingType = 'auto',
  } = options;

  // 息継ぎポイント検出
  const breathPoints = detectBreathPoints(text);

  // 文の種類判定
  const sentenceType = detectSentenceType(text);

  // 抑揚パターン生成
  const intonationPattern = generateIntonationPattern(text, sentenceType);

  // 間の長さ計算（平均）
  const pauseDuration = breathPoints.length > 0
    ? breathPoints.reduce((sum, pos) => {
        const punctuation = text[pos];
        return sum + calculatePauseDuration(punctuation, fireWaterBalance);
      }, 0) / breathPoints.length
    : 300;

  // 語尾スタイル判定
  const endingStyle = detectEndingStyle(text, fireWaterBalance);

  return {
    pauseDuration,
    breathPoints,
    intonationPattern,
    endingStyle,
    endingType,
  };
}

/**
 * 韻律を適用したテキストを生成（SSML形式）
 */
export function applyProsodyToSSML(
  text: string,
  prosody: ProsodyParams
): string {
  let ssml = '<speak>';

  // 抑揚パターンを適用
  let currentPos = 0;
  for (const point of prosody.intonationPattern) {
    const segment = text.slice(currentPos, point.position);
    const pitchValue = prosody.endingStyle === 'fire' ? '+10%' : '-10%';
    ssml += `<prosody pitch="${pitchValue}">${segment}</prosody>`;
    currentPos = point.position;
  }

  // 残りのテキスト
  if (currentPos < text.length) {
    ssml += text.slice(currentPos);
  }

  // 息継ぎポイントで間を追加
  for (const breathPoint of prosody.breathPoints) {
    const pauseMs = prosody.pauseDuration;
    ssml = ssml.replace(
      text[breathPoint],
      `${text[breathPoint]}<break time="${pauseMs}ms"/>`
    );
  }

  ssml += '</speak>';
  return ssml;
}

/**
 * 韻律情報を可視化
 */
export function visualizeProsody(text: string, prosody: ProsodyParams): string {
  let visualization = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // 息継ぎポイント
    if (prosody.breathPoints.includes(i)) {
      visualization += `[${char}|${prosody.pauseDuration}ms]`;
    }
    // 抑揚ポイント
    else if (prosody.intonationPattern.some(p => p.position === i)) {
      const point = prosody.intonationPattern.find(p => p.position === i)!;
      const arrow = point.pitchShift > 0 ? '↑' : point.pitchShift < 0 ? '↓' : '→';
      visualization += `${char}${arrow}`;
    }
    // 通常の文字
    else {
      visualization += char;
    }
  }

  return visualization;
}
