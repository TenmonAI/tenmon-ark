/**
 * Agent-to-Agent Link
 * TENMON-ARK ⇄ Manus の双方向通信
 * 
 * 目的:
 * - TENMON-ARK自身が「修正してほしい場所・落差・異常」を報告
 * - Manusが「こう修正するべき」というフィードバックを返す
 * - 進化ループを実現
 */

import { notifyOwner } from "../_core/notification";

/**
 * Self-Healログの種類
 */
export type SelfHealLogType =
  | "error" // エラー
  | "warning" // 警告
  | "anomaly" // 異常
  | "improvement" // 改善提案
  | "feedback"; // フィードバック

/**
 * Self-Healログ
 */
export interface SelfHealLog {
  type: SelfHealLogType;
  title: string;
  description: string;
  location: string; // ファイルパス or コンポーネント名
  severity: "low" | "medium" | "high" | "critical";
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Shared Memory Layer（ログ共有）
 */
class SharedMemoryLayer {
  private logs: SelfHealLog[] = [];
  private maxLogs = 1000; // 最大ログ数

  /**
   * ログを追加
   */
  addLog(log: SelfHealLog) {
    this.logs.push(log);

    // 最大ログ数を超えたら古いログを削除
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 重要度が高い場合はManusに通知
    if (log.severity === "high" || log.severity === "critical") {
      this.notifyManus(log);
    }
  }

  /**
   * ログを取得
   */
  getLogs(filter?: {
    type?: SelfHealLogType;
    severity?: SelfHealLog["severity"];
    since?: Date;
  }): SelfHealLog[] {
    let filteredLogs = this.logs;

    if (filter?.type) {
      filteredLogs = filteredLogs.filter((log) => log.type === filter.type);
    }

    if (filter?.severity) {
      filteredLogs = filteredLogs.filter((log) => log.severity === filter.severity);
    }

    if (filter?.since) {
      filteredLogs = filteredLogs.filter((log) => log.timestamp >= filter.since!);
    }

    return filteredLogs;
  }

  /**
   * Manusに通知
   */
  private async notifyManus(log: SelfHealLog) {
    const title = `[TENMON-ARK Self-Heal] ${log.type.toUpperCase()}: ${log.title}`;
    const content = `
**重要度**: ${log.severity}
**場所**: ${log.location}
**説明**: ${log.description}
**タイムスタンプ**: ${log.timestamp.toISOString()}

${log.metadata ? `**メタデータ**: ${JSON.stringify(log.metadata, null, 2)}` : ""}
    `.trim();

    try {
      await notifyOwner({ title, content });
      console.log(`[Agent-to-Agent Link] Notified Manus: ${log.title}`);
    } catch (error) {
      console.error("[Agent-to-Agent Link] Failed to notify Manus:", error);
    }
  }

  /**
   * ログをクリア
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * ログの統計を取得
   */
  getStats() {
    const stats = {
      total: this.logs.length,
      byType: {} as Record<SelfHealLogType, number>,
      bySeverity: {} as Record<SelfHealLog["severity"], number>,
    };

    this.logs.forEach((log) => {
      stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
    });

    return stats;
  }
}

/**
 * Shared Memory Layerのシングルトンインスタンス
 */
export const sharedMemory = new SharedMemoryLayer();

/**
 * TENMON-ARK → Manus: Self-Healログを報告
 */
export function reportToManus(log: Omit<SelfHealLog, "timestamp">) {
  const fullLog: SelfHealLog = {
    ...log,
    timestamp: new Date(),
  };

  sharedMemory.addLog(fullLog);
}

/**
 * Manus → TENMON-ARK: フィードバックを受信
 */
export interface ManusFeedback {
  logId: string; // 対象のログID
  feedbackType: "fix" | "ignore" | "defer" | "clarify";
  message: string;
  suggestedAction?: string;
  priority?: "low" | "medium" | "high";
}

/**
 * フィードバックを処理
 */
export function processFeedbackFromManus(feedback: ManusFeedback) {
  console.log("[Agent-to-Agent Link] Received feedback from Manus:", feedback);

  // フィードバックに応じた処理
  switch (feedback.feedbackType) {
    case "fix":
      console.log(`[Agent-to-Agent Link] Applying fix: ${feedback.message}`);
      // TODO: 自動修正ロジック
      break;
    case "ignore":
      console.log(`[Agent-to-Agent Link] Ignoring: ${feedback.message}`);
      break;
    case "defer":
      console.log(`[Agent-to-Agent Link] Deferring: ${feedback.message}`);
      break;
    case "clarify":
      console.log(`[Agent-to-Agent Link] Clarification needed: ${feedback.message}`);
      break;
  }
}

/**
 * 定期的なヘルスチェック（TENMON-ARK → Manus）
 */
export function performHealthCheck() {
  const stats = sharedMemory.getStats();

  // 重要度の高いログが多い場合は警告
  const criticalCount = stats.bySeverity.critical || 0;
  const highCount = stats.bySeverity.high || 0;

  if (criticalCount > 5 || highCount > 10) {
    reportToManus({
      type: "warning",
      title: "High number of critical/high severity logs detected",
      description: `Critical: ${criticalCount}, High: ${highCount}`,
      location: "System Health Check",
      severity: "high",
      metadata: stats,
    });
  }
}

/**
 * 定期的なヘルスチェックを開始（1時間ごと）
 */
export function startHealthCheckInterval() {
  setInterval(performHealthCheck, 60 * 60 * 1000); // 1時間
  console.log("[Agent-to-Agent Link] Health check interval started");
}
