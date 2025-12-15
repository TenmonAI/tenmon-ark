/**
 * Audio Sync — 音響同期
 * 
 * 位相を揃える（完全同期は後）
 * - NTP同期: server時刻を基準に client drift 補正
 * - AudioBuffer補正: FFTで位相差検出、±ms単位で再生位置補正
 */

let serverTimeOffset = 0; // サーバー時刻との差（ミリ秒）
let audioContext: AudioContext | null = null;
let driftCorrectionInterval: NodeJS.Timeout | null = null;

/**
 * NTP同期（サーバー時刻を基準に client drift 補正）
 * 
 * @param serverTimestamp サーバーからのタイムスタンプ（ミリ秒）
 */
export function syncNTP(serverTimestamp: number): void {
  const clientTime = Date.now();
  serverTimeOffset = serverTimestamp - clientTime;
  console.log('[Audio Sync] NTP offset:', serverTimeOffset, 'ms');
}

/**
 * サーバー時刻を取得（NTP同期後）
 */
export function getServerTime(): number {
  return Date.now() + serverTimeOffset;
}

/**
 * 位相差を検出（FFT）
 * 
 * @param audioBuffer1 基準オーディオバッファ
 * @param audioBuffer2 比較オーディオバッファ
 * @returns 位相差（ミリ秒）
 */
export async function detectPhaseDifference(
  audioBuffer1: AudioBuffer,
  audioBuffer2: AudioBuffer
): Promise<number> {
  // 簡易実装: クロスコリレーションで位相差を検出
  const channelData1 = audioBuffer1.getChannelData(0);
  const channelData2 = audioBuffer2.getChannelData(0);
  const sampleRate = audioBuffer1.sampleRate;

  // 最大相関位置を検出
  let maxCorrelation = 0;
  let maxOffset = 0;

  const searchRange = Math.min(channelData1.length, channelData2.length);
  for (let offset = -searchRange; offset < searchRange; offset += 100) {
    let correlation = 0;
    const start1 = Math.max(0, offset);
    const end1 = Math.min(channelData1.length, channelData2.length + offset);
    const start2 = Math.max(0, -offset);
    const end2 = Math.min(channelData2.length, channelData1.length - offset);

    for (let i = start1; i < end1; i++) {
      const j = i - offset;
      if (j >= 0 && j < channelData2.length) {
        correlation += channelData1[i] * channelData2[j];
      }
    }

    if (correlation > maxCorrelation) {
      maxCorrelation = correlation;
      maxOffset = offset;
    }
  }

  // ミリ秒に変換
  const phaseDifferenceMs = (maxOffset / sampleRate) * 1000;
  return phaseDifferenceMs;
}

/**
 * AudioBuffer補正（再生位置補正）
 * 
 * @param sourceNode オーディオソースノード
 * @param correctionMs 補正量（ミリ秒、正の値は遅延、負の値は早送り）
 */
export function correctAudioBuffer(
  sourceNode: AudioBufferSourceNode,
  correctionMs: number
): void {
  if (!audioContext) {
    audioContext = new AudioContext();
  }

  // 補正量をサンプル数に変換
  const correctionSamples = (correctionMs / 1000) * audioContext.sampleRate;

  // 再生開始時刻を調整
  if (sourceNode.buffer) {
    const currentTime = audioContext.currentTime;
    const adjustedTime = currentTime + (correctionMs / 1000);

    // 新しいソースノードを作成して補正
    const newSource = audioContext.createBufferSource();
    newSource.buffer = sourceNode.buffer;
    newSource.connect(audioContext.destination);
    newSource.start(adjustedTime);
  }
}

/**
 * ドリフト補正を開始（定期的にNTP同期）
 * 
 * @param syncCallback 同期コールバック（サーバー時刻を取得）
 */
export function startDriftCorrection(
  syncCallback: () => Promise<number>
): void {
  if (driftCorrectionInterval) {
    clearInterval(driftCorrectionInterval);
  }

  // 30秒ごとにNTP同期
  driftCorrectionInterval = setInterval(async () => {
    try {
      const serverTimestamp = await syncCallback();
      syncNTP(serverTimestamp);
    } catch (error) {
      console.warn('[Audio Sync] Drift correction failed:', error);
    }
  }, 30000);
}

/**
 * ドリフト補正を停止
 */
export function stopDriftCorrection(): void {
  if (driftCorrectionInterval) {
    clearInterval(driftCorrectionInterval);
    driftCorrectionInterval = null;
  }
}

/**
 * AudioContextを取得
 */
export function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

