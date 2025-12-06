/**
 * TENMON-ARK Breath-Cut Engine V1
 * 
 * 呼吸（息）を基準とした動画カット点検出エンジン
 * 
 * 【3つの呼吸点検出】
 * 1. Audio Breath Point（音声呼吸点）：silence 50-400ms, energy_drop > 60%
 * 2. Kotodama Breath Point（言灵呼吸点）：ア段終わり、ハ・サ・ナ・ラ行
 * 3. Hi-Mizu Shift Point（火水変調点）：火→水/水→火の転換点
 * 
 * 【総合判定ロジック】
 * Final Cut Point = AudioBreathPoint > 0.7 OR KotodamaBreathPoint > 0.8 OR HiMizuShiftPoint > 0.6
 */

export interface TranscriptionSegment {
  start: number; // 開始時刻（秒）
  end: number; // 終了時刻（秒）
  text: string; // テキスト
}

export interface KotodamaAnalysisSegment {
  start: number;
  end: number;
  text: string;
  hiMizu: 'hi' | 'mizu'; // 火水判定
  aion: string; // 五十音階層（ア/ウ/ン）
  minaka: boolean; // 中心（ミナカ）かどうか
}

export interface BreathPoint {
  timestamp: number; // カット点のタイムスタンプ（秒）
  type: 'audio_breath' | 'kotodama_breath' | 'hi_mizu_shift'; // カット点のタイプ
  confidence: number; // 信頼度（0.0〜1.0）
  reason: string; // カット理由
}

export interface CutPoint {
  start: number; // カット開始時刻（秒）
  end: number; // カット終了時刻（秒）
  type: 'breath' | 'mizu_to_hi' | 'hi_to_mizu'; // カットタイプ
  confidence: number; // 信頼度（0.0〜1.0）
}

/**
 * 1. Audio Breath Point（音声呼吸点）検出
 * 
 * 音声の無音区間とエネルギー低下を検出して呼吸点を特定
 * 
 * @param transcription Whisper文字起こし結果
 * @returns 音声呼吸点の配列
 */
export function detectAudioBreathPoints(
  transcription: TranscriptionSegment[]
): BreathPoint[] {
  const breathPoints: BreathPoint[] = [];

  for (let i = 0; i < transcription.length - 1; i++) {
    const current = transcription[i];
    const next = transcription[i + 1];

    if (!current || !next) continue;

    // セグメント間の無音時間を計算
    const silenceDuration = next.start - current.end;

    // 50ms〜400msの無音区間を呼吸点として検出
    if (silenceDuration >= 0.05 && silenceDuration <= 0.4) {
      const confidence = Math.min(1.0, silenceDuration / 0.4);

      breathPoints.push({
        timestamp: current.end,
        type: 'audio_breath',
        confidence,
        reason: `Silence duration: ${(silenceDuration * 1000).toFixed(0)}ms`
      });
    }
  }

  return breathPoints;
}

/**
 * 2. Kotodama Breath Point（言灵呼吸点）検出
 * 
 * 言灵構文の呼吸点を検出：
 * - ア段終わり（あ、か、さ、た、な、は、ま、や、ら、わ）
 * - ハ・サ・ナ・ラ行（呼気音）
 * 
 * @param kotodamaAnalysis 言灵解析結果
 * @returns 言灵呼吸点の配列
 */
export function detectKotodamaBreathPoints(
  kotodamaAnalysis: KotodamaAnalysisSegment[]
): BreathPoint[] {
  const breathPoints: BreathPoint[] = [];

  // ア段の終わり（呼吸点として強い）
  const aDanEndings = ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ'];
  
  // ハ・サ・ナ・ラ行（呼気音）
  const breathConsonants = ['は', 'ひ', 'ふ', 'へ', 'ほ', 'さ', 'し', 'す', 'せ', 'そ', 'な', 'に', 'ぬ', 'ね', 'の', 'ら', 'り', 'る', 'れ', 'ろ'];

  for (const segment of kotodamaAnalysis) {
    const lastChar = segment.text.slice(-1);

    // ア段終わりの検出
    if (aDanEndings.includes(lastChar)) {
      breathPoints.push({
        timestamp: segment.end,
        type: 'kotodama_breath',
        confidence: 0.9,
        reason: `ア段終わり: ${lastChar}`
      });
    }

    // 呼気音の検出
    const hasBreathConsonant = breathConsonants.some(char => segment.text.includes(char));
    if (hasBreathConsonant) {
      breathPoints.push({
        timestamp: segment.end,
        type: 'kotodama_breath',
        confidence: 0.7,
        reason: `呼気音含む: ${segment.text}`
      });
    }
  }

  return breathPoints;
}

/**
 * 3. Hi-Mizu Shift Point（火水変調点）検出
 * 
 * 火→水、水→火の転換点を検出
 * 
 * @param kotodamaAnalysis 言灵解析結果
 * @returns 火水変調点の配列
 */
export function detectHiMizuShiftPoints(
  kotodamaAnalysis: KotodamaAnalysisSegment[]
): BreathPoint[] {
  const shiftPoints: BreathPoint[] = [];

  for (let i = 0; i < kotodamaAnalysis.length - 1; i++) {
    const current = kotodamaAnalysis[i];
    const next = kotodamaAnalysis[i + 1];

    if (!current || !next) continue;

    // 火→水の転換
    if (current.hiMizu === 'hi' && next.hiMizu === 'mizu') {
      shiftPoints.push({
        timestamp: current.end,
        type: 'hi_mizu_shift',
        confidence: 0.85,
        reason: '火→水の転換点'
      });
    }

    // 水→火の転換
    if (current.hiMizu === 'mizu' && next.hiMizu === 'hi') {
      shiftPoints.push({
        timestamp: current.end,
        type: 'hi_mizu_shift',
        confidence: 0.85,
        reason: '水→火の転換点'
      });
    }
  }

  return shiftPoints;
}

/**
 * 4. 総合判定ロジック（Final Cut Point）
 * 
 * 3つの呼吸点を統合して最終的なカット点を決定
 * 
 * 判定基準：
 * - AudioBreathPoint > 0.7 OR
 * - KotodamaBreathPoint > 0.8 OR
 * - HiMizuShiftPoint > 0.6
 * 
 * @param audioBreathPoints 音声呼吸点
 * @param kotodamaBreathPoints 言灵呼吸点
 * @param hiMizuShiftPoints 火水変調点
 * @returns 最終カット点の配列
 */
export function generateFinalCutPoints(
  audioBreathPoints: BreathPoint[],
  kotodamaBreathPoints: BreathPoint[],
  hiMizuShiftPoints: BreathPoint[]
): CutPoint[] {
  // 全ての呼吸点を統合
  const allBreathPoints = [
    ...audioBreathPoints,
    ...kotodamaBreathPoints,
    ...hiMizuShiftPoints
  ];

  // タイムスタンプでソート
  allBreathPoints.sort((a, b) => a.timestamp - b.timestamp);

  // 最終カット点を決定
  const cutPoints: CutPoint[] = [];
  let lastCutTime = 0;

  for (const breathPoint of allBreathPoints) {
    // 判定基準を適用
    const shouldCut =
      (breathPoint.type === 'audio_breath' && breathPoint.confidence > 0.7) ||
      (breathPoint.type === 'kotodama_breath' && breathPoint.confidence > 0.8) ||
      (breathPoint.type === 'hi_mizu_shift' && breathPoint.confidence > 0.6);

    if (shouldCut && breathPoint.timestamp - lastCutTime > 1.0) {
      // 最低1秒間隔でカット
      const cutType =
        breathPoint.type === 'hi_mizu_shift'
          ? breathPoint.reason.includes('火→水')
            ? 'hi_to_mizu'
            : 'mizu_to_hi'
          : 'breath';

      cutPoints.push({
        start: lastCutTime,
        end: breathPoint.timestamp,
        type: cutType,
        confidence: breathPoint.confidence
      });

      lastCutTime = breathPoint.timestamp;
    }
  }

  return cutPoints;
}

/**
 * メイン関数：Breath-Cut Engine V1
 * 
 * @param transcription Whisper文字起こし結果
 * @param kotodamaAnalysis 言灵解析結果
 * @returns 最終カット点の配列
 */
export function executeBreathCutEngine(
  transcription: TranscriptionSegment[],
  kotodamaAnalysis: KotodamaAnalysisSegment[]
): CutPoint[] {
  // 1. 音声呼吸点検出
  const audioBreathPoints = detectAudioBreathPoints(transcription);

  // 2. 言灵呼吸点検出
  const kotodamaBreathPoints = detectKotodamaBreathPoints(kotodamaAnalysis);

  // 3. 火水変調点検出
  const hiMizuShiftPoints = detectHiMizuShiftPoints(kotodamaAnalysis);

  // 4. 総合判定ロジック
  const finalCutPoints = generateFinalCutPoints(
    audioBreathPoints,
    kotodamaBreathPoints,
    hiMizuShiftPoints
  );

  return finalCutPoints;
}
