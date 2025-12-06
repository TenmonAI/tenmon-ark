/**
 * TENMON-ARK High-Speed Turbo Engine v10
 * 天津金木ターボエンジン v10
 * 
 * 【目標】
 * - 人間対話レベルの応答速度（遅延ほぼゼロ）
 * - 初速応答 < 500ms
 * - ストリーミング速度 8ms/chunk
 * 
 * 【最適化項目】
 * 1. persona.thinking.depth を "surface" へ変更
 * 2. persona.core.momentum を 10倍へ
 * 3. streamingChunkInterval を 45ms → 8ms に短縮
 * 4. persona.latency.compensation を有効化
 * 5. LPチャット高速応答優先モード実装
 */

/**
 * Turbo Engine Configuration
 */
export const TURBO_ENGINE_V10_CONFIG = {
  /**
   * 思考深度設定
   * "surface" = 初速応答を最優先（深層推論は維持）
   */
  thinkingDepth: 'surface' as const,

  /**
   * Twin-Core モーメンタム（火水回転速度）
   * 通常: 1.0 → ターボ: 10.0
   */
  coreMomentum: 10.0,

  /**
   * ストリーミングチャンク間隔
   * 通常: 45ms → ターボ: 8ms
   */
  streamingChunkInterval: 8, // ms

  /**
   * 遅延補正機能
   * 回線遅延を補正し、即応答に見せる
   */
  latencyCompensation: true,

  /**
   * 初速応答目標時間
   */
  targetInitialResponseTime: 500, // ms

  /**
   * LP-QA 高速応答優先モード
   * /embed/qa-frame はデフォルトで高速モード
   */
  lpQaHighSpeedMode: true,

  /**
   * バッファサイズ最適化
   * ストリーミング時のバッファサイズを最小化
   */
  streamingBufferSize: 1, // chunks

  /**
   * 並列処理最適化
   * Memory Sync と LLM 呼び出しを並列化
   */
  parallelProcessing: true,

  /**
   * キャッシュ戦略
   * 頻繁に使用されるプロンプトをキャッシュ
   */
  promptCaching: true,

  /**
   * プリフェッチ機能
   * ユーザーの次の質問を予測してプリフェッチ
   */
  prefetchEnabled: false, // 将来実装予定
};

/**
 * Get optimized streaming interval based on mode
 * 
 * @param mode - "turbo" | "normal" | "quality"
 * @returns Streaming interval in milliseconds
 */
export function getStreamingInterval(mode: 'turbo' | 'normal' | 'quality' = 'turbo'): number {
  switch (mode) {
    case 'turbo':
      return TURBO_ENGINE_V10_CONFIG.streamingChunkInterval; // 8ms
    case 'normal':
      return 20; // 20ms
    case 'quality':
      return 45; // 45ms (original)
    default:
      return TURBO_ENGINE_V10_CONFIG.streamingChunkInterval;
  }
}

/**
 * Get optimized thinking depth based on mode
 * 
 * @param mode - "turbo" | "normal" | "deep"
 * @returns Thinking depth
 */
export function getThinkingDepth(mode: 'turbo' | 'normal' | 'deep' = 'turbo'): string {
  switch (mode) {
    case 'turbo':
      return TURBO_ENGINE_V10_CONFIG.thinkingDepth; // "surface"
    case 'normal':
      return 'middle';
    case 'deep':
      return 'deep';
    default:
      return TURBO_ENGINE_V10_CONFIG.thinkingDepth;
  }
}

/**
 * Get optimized core momentum based on mode
 * 
 * @param mode - "turbo" | "normal" | "balanced"
 * @returns Core momentum multiplier
 */
export function getCoreMomentum(mode: 'turbo' | 'normal' | 'balanced' = 'turbo'): number {
  switch (mode) {
    case 'turbo':
      return TURBO_ENGINE_V10_CONFIG.coreMomentum; // 10.0
    case 'normal':
      return 5.0;
    case 'balanced':
      return 1.0;
    default:
      return TURBO_ENGINE_V10_CONFIG.coreMomentum;
  }
}

/**
 * Check if latency compensation is enabled
 * 
 * @returns Boolean indicating if latency compensation is enabled
 */
export function isLatencyCompensationEnabled(): boolean {
  return TURBO_ENGINE_V10_CONFIG.latencyCompensation;
}

/**
 * Get target initial response time
 * 
 * @returns Target time in milliseconds
 */
export function getTargetInitialResponseTime(): number {
  return TURBO_ENGINE_V10_CONFIG.targetInitialResponseTime;
}

/**
 * Check if LP-QA high-speed mode is enabled
 * 
 * @returns Boolean indicating if LP-QA high-speed mode is enabled
 */
export function isLpQaHighSpeedModeEnabled(): boolean {
  return TURBO_ENGINE_V10_CONFIG.lpQaHighSpeedMode;
}

/**
 * Performance monitoring helper
 * 
 * @param startTime - Start timestamp
 * @returns Elapsed time in milliseconds
 */
export function measurePerformance(startTime: number): number {
  return Date.now() - startTime;
}

/**
 * Log performance metrics
 * 
 * @param operation - Operation name
 * @param elapsedTime - Elapsed time in milliseconds
 */
export function logPerformance(operation: string, elapsedTime: number): void {
  const targetTime = getTargetInitialResponseTime();
  const status = elapsedTime < targetTime ? '✅ FAST' : '⚠️ SLOW';
  
  console.log(`[Turbo Engine v10] ${status} ${operation}: ${elapsedTime}ms (target: ${targetTime}ms)`);
}
