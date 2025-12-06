/**
 * TENMON-ARK Kotodama Subtitle Engine V1
 * 
 * 言灵構文に基づく字幕生成エンジン
 * 
 * 【4つの核心機能】
 * 1. ミナカ中心の文章分節化（最大20文字、重心語を必ず含む）
 * 2. 火水による語尾・色変調（火=断定・赤寄り、水=柔らか・青寄り）
 * 3. 五十音響き強調（カ・タ・マ・ナ・ア強調、ユ・ル・モ柔化）
 * 4. 呼吸リズムと字幕速度の同期（1字幕あたり0.8〜2.4秒）
 */

export interface KotodamaAnalysisSegment {
  start: number;
  end: number;
  text: string;
  hiMizu: 'hi' | 'mizu'; // 火水判定
  aion: string; // 五十音階層（ア/ウ/ン）
  minaka: boolean; // 中心（ミナカ）かどうか
}

export interface CutPoint {
  start: number;
  end: number;
  type: 'breath' | 'mizu_to_hi' | 'hi_to_mizu';
  confidence: number;
}

export interface Subtitle {
  start: number; // 字幕開始時刻（秒）
  end: number; // 字幕終了時刻（秒）
  subtitle: string; // 字幕テキスト
  hiMizu: 'hi' | 'mizu'; // 火水判定
  aion: string; // 五十音階層（ア/ウ/ン）
  color: string; // 字幕色（HEX）
  style: 'strong' | 'soft' | 'neutral'; // 字幕スタイル
}

/**
 * 1. ミナカ中心の文章分節化
 * 
 * 最大20文字で文章を分節化し、重心語（ミナカ）を必ず含む
 * 
 * @param kotodamaAnalysis 言灵解析結果
 * @param cutPoints カット点
 * @returns 分節化された文章の配列
 */
export function segmentByMinaka(
  kotodamaAnalysis: KotodamaAnalysisSegment[],
  cutPoints: CutPoint[]
): KotodamaAnalysisSegment[] {
  const segments: KotodamaAnalysisSegment[] = [];
  let currentSegment: KotodamaAnalysisSegment | null = null;

  for (const analysis of kotodamaAnalysis) {
    // 新しいセグメントを開始
    if (!currentSegment) {
      currentSegment = { ...analysis };
      continue;
    }

    // ミナカ（中心）を含む場合は必ず分節
    if (analysis.minaka) {
      segments.push(currentSegment);
      currentSegment = { ...analysis };
      continue;
    }

    // 20文字を超える場合は分節
    if (currentSegment.text.length + analysis.text.length > 20) {
      segments.push(currentSegment);
      currentSegment = { ...analysis };
      continue;
    }

    // カット点を跨ぐ場合は分節
    const crossesCutPoint = cutPoints.some(
      cut => cut.start > currentSegment!.end && cut.start < analysis.end
    );
    if (crossesCutPoint) {
      segments.push(currentSegment);
      currentSegment = { ...analysis };
      continue;
    }

    // セグメントを結合
    currentSegment.text += analysis.text;
    currentSegment.end = analysis.end;
  }

  // 最後のセグメントを追加
  if (currentSegment) {
    segments.push(currentSegment);
  }

  return segments;
}

/**
 * 2. 火水による語尾・色変調
 * 
 * 火=断定・赤寄り（#FF6B6B）
 * 水=柔らか・青寄り（#4ECDC4）
 * 
 * @param hiMizu 火水判定
 * @returns 字幕色（HEX）
 */
export function getColorByHiMizu(hiMizu: 'hi' | 'mizu'): string {
  return hiMizu === 'hi' ? '#FF6B6B' : '#4ECDC4';
}

/**
 * 3. 五十音響き強調
 * 
 * カ・タ・マ・ナ・ア行：強調（strong）
 * ユ・ル・モ：柔化（soft）
 * その他：中立（neutral）
 * 
 * @param text テキスト
 * @returns 字幕スタイル
 */
export function getStyleByAion(text: string): 'strong' | 'soft' | 'neutral' {
  // 強調音（カ・タ・マ・ナ・ア行）
  const strongChars = ['か', 'き', 'く', 'け', 'こ', 'た', 'ち', 'つ', 'て', 'と', 'ま', 'み', 'む', 'め', 'も', 'な', 'に', 'ぬ', 'ね', 'の', 'あ', 'い', 'う', 'え', 'お'];
  
  // 柔化音（ユ・ル・モ）
  const softChars = ['ゆ', 'よ', 'る', 'れ', 'ろ', 'も'];

  const hasStrongChar = strongChars.some(char => text.includes(char));
  const hasSoftChar = softChars.some(char => text.includes(char));

  if (hasStrongChar) return 'strong';
  if (hasSoftChar) return 'soft';
  return 'neutral';
}

/**
 * 4. 呼吸リズムと字幕速度の同期
 * 
 * 1字幕あたり0.8〜2.4秒の範囲で調整
 * 
 * @param segment 分節化されたセグメント
 * @returns 調整された字幕
 */
export function adjustSubtitleTiming(
  segment: KotodamaAnalysisSegment
): { start: number; end: number } {
  const duration = segment.end - segment.start;
  const textLength = segment.text.length;

  // 1文字あたり0.1〜0.2秒を基準
  const idealDuration = textLength * 0.15;

  // 0.8〜2.4秒の範囲に制限
  const adjustedDuration = Math.max(0.8, Math.min(2.4, idealDuration));

  return {
    start: segment.start,
    end: segment.start + adjustedDuration
  };
}

/**
 * メイン関数：Kotodama Subtitle Engine V1
 * 
 * @param kotodamaAnalysis 言灵解析結果
 * @param cutPoints カット点
 * @returns 字幕の配列
 */
export function executeKotodamaSubtitleEngine(
  kotodamaAnalysis: KotodamaAnalysisSegment[],
  cutPoints: CutPoint[]
): Subtitle[] {
  // 1. ミナカ中心の文章分節化
  const segments = segmentByMinaka(kotodamaAnalysis, cutPoints);

  // 2-4. 火水・五十音・呼吸リズムの統合
  const subtitles: Subtitle[] = segments.map(segment => {
    // 2. 火水による色変調
    const color = getColorByHiMizu(segment.hiMizu);

    // 3. 五十音響き強調
    const style = getStyleByAion(segment.text);

    // 4. 呼吸リズムと字幕速度の同期
    const timing = adjustSubtitleTiming(segment);

    return {
      start: timing.start,
      end: timing.end,
      subtitle: segment.text,
      hiMizu: segment.hiMizu,
      aion: segment.aion,
      color,
      style
    };
  });

  return subtitles;
}

/**
 * 字幕をSRT形式に変換
 * 
 * @param subtitles 字幕の配列
 * @returns SRT形式の字幕文字列
 */
export function convertToSRT(subtitles: Subtitle[]): string {
  let srt = '';

  subtitles.forEach((subtitle, index) => {
    const startTime = formatSRTTime(subtitle.start);
    const endTime = formatSRTTime(subtitle.end);

    srt += `${index + 1}\n`;
    srt += `${startTime} --> ${endTime}\n`;
    srt += `${subtitle.subtitle}\n`;
    srt += '\n';
  });

  return srt;
}

/**
 * 時刻をSRT形式にフォーマット
 * 
 * @param seconds 秒数
 * @returns SRT形式の時刻文字列（HH:MM:SS,mmm）
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

/**
 * 字幕をVTT形式に変換
 * 
 * @param subtitles 字幕の配列
 * @returns VTT形式の字幕文字列
 */
export function convertToVTT(subtitles: Subtitle[]): string {
  let vtt = 'WEBVTT\n\n';

  subtitles.forEach((subtitle, index) => {
    const startTime = formatVTTTime(subtitle.start);
    const endTime = formatVTTTime(subtitle.end);

    vtt += `${index + 1}\n`;
    vtt += `${startTime} --> ${endTime}\n`;
    vtt += `${subtitle.subtitle}\n`;
    vtt += '\n';
  });

  return vtt;
}

/**
 * 時刻をVTT形式にフォーマット
 * 
 * @param seconds 秒数
 * @returns VTT形式の時刻文字列（HH:MM:SS.mmm）
 */
function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}
