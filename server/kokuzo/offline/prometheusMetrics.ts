/**
 * Prometheus Metrics — Prometheusメトリクス追加
 * 
 * TENMON-ARKの内部状態をPrometheus形式で出力
 */

import { getMetricsCollector } from './metricsCollector';

/**
 * Prometheus形式のメトリクスを生成
 */
export function generatePrometheusMetrics(): string {
  const collector = getMetricsCollector();
  const metrics = collector.getMetrics();

  const lines: string[] = [];

  // Event総数
  lines.push(`# HELP tenmon_kokuzo_events_total Total number of events`);
  lines.push(`# TYPE tenmon_kokuzo_events_total counter`);
  lines.push(`tenmon_kokuzo_events_total ${metrics.totalEvents}`);

  // Snapshot生成回数
  lines.push(`# HELP tenmon_kokuzo_snapshots_total Total number of snapshots`);
  lines.push(`# TYPE tenmon_kokuzo_snapshots_total counter`);
  lines.push(`tenmon_kokuzo_snapshots_total ${metrics.snapshotCount}`);

  // Replay時間
  lines.push(`# HELP tenmon_kokuzo_replay_time_seconds Replay time in seconds`);
  lines.push(`# TYPE tenmon_kokuzo_replay_time_seconds gauge`);
  lines.push(`tenmon_kokuzo_replay_time_seconds ${metrics.replayTime / 1000}`);

  // ingest失敗率
  lines.push(`# HELP tenmon_kokuzo_ingest_failure_rate Ingest failure rate`);
  lines.push(`# TYPE tenmon_kokuzo_ingest_failure_rate gauge`);
  lines.push(`tenmon_kokuzo_ingest_failure_rate ${metrics.ingestFailureRate}`);

  // Sync失敗率
  lines.push(`# HELP tenmon_kokuzo_sync_failure_rate Sync failure rate`);
  lines.push(`# TYPE tenmon_kokuzo_sync_failure_rate gauge`);
  lines.push(`tenmon_kokuzo_sync_failure_rate ${metrics.syncFailureRate}`);

  return lines.join('\n') + '\n';
}

