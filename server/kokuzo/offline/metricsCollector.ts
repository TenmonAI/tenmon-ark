/**
 * ============================================================
 *  METRICS COLLECTOR — 観測用メトリクス収集
 * ============================================================
 * 
 * TENMON-ARKの内部状態を後から完全に追跡できるようにする
 * UI表示なし、Adminログのみ
 * ============================================================
 */

/**
 * メトリクス種別
 */
export interface KokuzoMetrics {
  /** Event総数 */
  totalEvents: number;
  /** Snapshot生成回数 */
  snapshotCount: number;
  /** Replay時間（ミリ秒） */
  replayTime: number;
  /** ingest総数 */
  ingestTotal: number;
  /** ingest成功数 */
  ingestSuccess: number;
  /** ingest失敗数 */
  ingestFailure: number;
  /** ingest失敗率（0.0 - 1.0） */
  ingestFailureRate: number;
  /** Sync試行回数 */
  syncAttempts: number;
  /** Sync成功回数 */
  syncSuccess: number;
  /** Sync失敗回数 */
  syncFailure: number;
  /** Sync失敗率（0.0 - 1.0） */
  syncFailureRate: number;
  /** 最終更新時刻 */
  lastUpdated: number;
}

/**
 * メトリクスコレクター（シングルトン）
 */
class MetricsCollector {
  private metrics: KokuzoMetrics = {
    totalEvents: 0,
    snapshotCount: 0,
    replayTime: 0,
    ingestTotal: 0,
    ingestSuccess: 0,
    ingestFailure: 0,
    ingestFailureRate: 0,
    syncAttempts: 0,
    syncSuccess: 0,
    syncFailure: 0,
    syncFailureRate: 0,
    lastUpdated: Date.now(),
  };

  /**
   * Event総数を増加
   */
  incrementEventCount(count: number = 1): void {
    this.metrics.totalEvents += count;
    this.metrics.lastUpdated = Date.now();
    this.logMetrics("EVENT_COUNT", { count });
  }

  /**
   * Snapshot生成回数を増加
   */
  incrementSnapshotCount(): void {
    this.metrics.snapshotCount++;
    this.metrics.lastUpdated = Date.now();
    this.logMetrics("SNAPSHOT_GENERATED", { count: this.metrics.snapshotCount });
  }

  /**
   * Replay時間を記録
   */
  recordReplayTime(timeMs: number): void {
    this.metrics.replayTime = timeMs;
    this.metrics.lastUpdated = Date.now();
    this.logMetrics("REPLAY_TIME", { timeMs });
  }

  /**
   * ingest成功を記録
   */
  recordIngestSuccess(): void {
    this.metrics.ingestTotal++;
    this.metrics.ingestSuccess++;
    this.updateIngestFailureRate();
    this.metrics.lastUpdated = Date.now();
    this.logMetrics("INGEST_SUCCESS", {
      total: this.metrics.ingestTotal,
      success: this.metrics.ingestSuccess,
      failure: this.metrics.ingestFailure,
      failureRate: this.metrics.ingestFailureRate,
    });
  }

  /**
   * ingest失敗を記録
   */
  recordIngestFailure(): void {
    this.metrics.ingestTotal++;
    this.metrics.ingestFailure++;
    this.updateIngestFailureRate();
    this.metrics.lastUpdated = Date.now();
    this.logMetrics("INGEST_FAILURE", {
      total: this.metrics.ingestTotal,
      success: this.metrics.ingestSuccess,
      failure: this.metrics.ingestFailure,
      failureRate: this.metrics.ingestFailureRate,
    });
  }

  /**
   * Sync成功を記録
   */
  recordSyncSuccess(): void {
    this.metrics.syncAttempts++;
    this.metrics.syncSuccess++;
    this.updateSyncFailureRate();
    this.metrics.lastUpdated = Date.now();
    this.logMetrics("SYNC_SUCCESS", {
      attempts: this.metrics.syncAttempts,
      success: this.metrics.syncSuccess,
      failure: this.metrics.syncFailure,
      failureRate: this.metrics.syncFailureRate,
    });
  }

  /**
   * Sync失敗を記録
   */
  recordSyncFailure(): void {
    this.metrics.syncAttempts++;
    this.metrics.syncFailure++;
    this.updateSyncFailureRate();
    this.metrics.lastUpdated = Date.now();
    this.logMetrics("SYNC_FAILURE", {
      attempts: this.metrics.syncAttempts,
      success: this.metrics.syncSuccess,
      failure: this.metrics.syncFailure,
      failureRate: this.metrics.syncFailureRate,
    });
  }

  /**
   * ingest失敗率を更新
   */
  private updateIngestFailureRate(): void {
    if (this.metrics.ingestTotal > 0) {
      this.metrics.ingestFailureRate = this.metrics.ingestFailure / this.metrics.ingestTotal;
    } else {
      this.metrics.ingestFailureRate = 0;
    }
  }

  /**
   * Sync失敗率を更新
   */
  private updateSyncFailureRate(): void {
    if (this.metrics.syncAttempts > 0) {
      this.metrics.syncFailureRate = this.metrics.syncFailure / this.metrics.syncAttempts;
    } else {
      this.metrics.syncFailureRate = 0;
    }
  }

  /**
   * メトリクスを取得
   */
  getMetrics(): KokuzoMetrics {
    return { ...this.metrics };
  }

  /**
   * メトリクスをリセット
   */
  resetMetrics(): void {
    this.metrics = {
      totalEvents: 0,
      snapshotCount: 0,
      replayTime: 0,
      ingestTotal: 0,
      ingestSuccess: 0,
      ingestFailure: 0,
      ingestFailureRate: 0,
      syncAttempts: 0,
      syncSuccess: 0,
      syncFailure: 0,
      syncFailureRate: 0,
      lastUpdated: Date.now(),
    };
    this.logMetrics("METRICS_RESET", {});
  }

  /**
   * Adminログ出力（内部のみ）
   */
  private logMetrics(event: string, data: any): void {
    // Adminログのみ（本番環境では専用ログファイルまたは監視システムに送信）
    if (process.env.NODE_ENV === "development" || process.env.ENABLE_ADMIN_LOGS === "true") {
      console.log(`[KOKUZO][METRICS][${event}]`, JSON.stringify(data, null, 2));
    }
  }

  /**
   * メトリクスサマリーを取得（Admin用）
   */
  getSummary(): string {
    const m = this.metrics;
    return `
[KOKUZO METRICS SUMMARY]
- Total Events: ${m.totalEvents}
- Snapshots Generated: ${m.snapshotCount}
- Last Replay Time: ${m.replayTime}ms
- Ingest: ${m.ingestSuccess}/${m.ingestTotal} (Failure Rate: ${(m.ingestFailureRate * 100).toFixed(2)}%)
- Sync: ${m.syncSuccess}/${m.syncAttempts} (Failure Rate: ${(m.syncFailureRate * 100).toFixed(2)}%)
- Last Updated: ${new Date(m.lastUpdated).toISOString()}
`.trim();
  }
}

/**
 * グローバルメトリクスコレクターインスタンス
 */
let globalMetricsCollector: MetricsCollector | null = null;

/**
 * メトリクスコレクターを取得
 */
export function getMetricsCollector(): MetricsCollector {
  if (!globalMetricsCollector) {
    globalMetricsCollector = new MetricsCollector();
  }
  return globalMetricsCollector;
}

/**
 * メトリクスを取得（Admin用）
 */
export function getKokuzoMetrics(): KokuzoMetrics {
  return getMetricsCollector().getMetrics();
}

/**
 * メトリクスサマリーを取得（Admin用）
 */
export function getKokuzoMetricsSummary(): string {
  return getMetricsCollector().getSummary();
}

