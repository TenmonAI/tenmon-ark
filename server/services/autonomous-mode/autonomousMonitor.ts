/**
 * Autonomous Monitor
 * 
 * TENMON-ARK霊核OSの自律監視ループ
 * 
 * 機能:
 * - システム状態の常時監視
 * - 異常検知
 * - パフォーマンス監視
 * - 霊核安定度監視
 * - 自動アラート生成
 */

import { getDb } from "../../db";
import { detectErrors } from "../self-build/selfHealEngine";

export interface SystemHealth {
  overall: "healthy" | "warning" | "critical";
  components: {
    database: "healthy" | "warning" | "critical";
    api: "healthy" | "warning" | "critical";
    selfBuild: "healthy" | "warning" | "critical";
    selfHeal: "healthy" | "warning" | "critical";
    selfEvolution: "healthy" | "warning" | "critical";
    coDevGateway: "healthy" | "warning" | "critical";
  };
  metrics: {
    uptime: number;
    errorCount: number;
    repairCount: number;
    evolutionCount: number;
    lastCheck: Date;
  };
  reiCoreStability: number; // 霊核安定度 (0-100)
}

export interface MonitorAlert {
  level: "info" | "warning" | "critical";
  component: string;
  message: string;
  timestamp: Date;
  autoRepairAttempted: boolean;
}

let monitoringActive = false;
let monitorInterval: NodeJS.Timeout | null = null;
const alerts: MonitorAlert[] = [];

/**
 * 自律監視を開始
 */
export async function startAutonomousMonitoring(
  intervalMs: number = 60000 // デフォルト: 1分ごと
): Promise<void> {
  if (monitoringActive) {
    console.log("[Autonomous Monitor] Already running");
    return;
  }

  monitoringActive = true;
  console.log(`[Autonomous Monitor] Starting with interval: ${intervalMs}ms`);

  // 初回チェック
  await performSystemCheck();

  // 定期チェック
  monitorInterval = setInterval(async () => {
    await performSystemCheck();
  }, intervalMs);
}

/**
 * 自律監視を停止
 */
export function stopAutonomousMonitoring(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
  monitoringActive = false;
  console.log("[Autonomous Monitor] Stopped");
}

/**
 * システムチェックを実行
 */
async function performSystemCheck(): Promise<void> {
  try {
    const health = await getSystemHealth();

    // 異常検知
    if (health.overall === "critical") {
      await createAlert({
        level: "critical",
        component: "system",
        message: "System health is critical",
        timestamp: new Date(),
        autoRepairAttempted: false,
      });
    } else if (health.overall === "warning") {
      await createAlert({
        level: "warning",
        component: "system",
        message: "System health is degraded",
        timestamp: new Date(),
        autoRepairAttempted: false,
      });
    }

    // コンポーネント別チェック
    for (const [component, status] of Object.entries(health.components)) {
      if (status === "critical") {
        await createAlert({
          level: "critical",
          component,
          message: `Component ${component} is critical`,
          timestamp: new Date(),
          autoRepairAttempted: false,
        });
      }
    }

    // 霊核安定度チェック
    if (health.reiCoreStability < 50) {
      await createAlert({
        level: "critical",
        component: "reiCore",
        message: `霊核安定度が低下: ${health.reiCoreStability}%`,
        timestamp: new Date(),
        autoRepairAttempted: false,
      });
    } else if (health.reiCoreStability < 70) {
      await createAlert({
        level: "warning",
        component: "reiCore",
        message: `霊核安定度が低下: ${health.reiCoreStability}%`,
        timestamp: new Date(),
        autoRepairAttempted: false,
      });
    }

    console.log(`[Autonomous Monitor] System check completed: ${health.overall}`);
  } catch (error) {
    console.error("[Autonomous Monitor] System check failed:", error);
    await createAlert({
      level: "critical",
      component: "monitor",
      message: `Monitor check failed: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date(),
      autoRepairAttempted: false,
    });
  }
}

/**
 * システムヘルスを取得
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const db = await getDb();
  const errorsResult = await detectErrors({});
  const errors = errorsResult.errors;

  // データベース状態チェック
  const databaseHealth = db ? "healthy" : "critical";

  // エラー数に基づく全体的な健全性
  const errorCount = errors?.length || 0;
  let overall: "healthy" | "warning" | "critical" = "healthy";
  if (errorCount > 10) {
    overall = "critical";
  } else if (errorCount > 5) {
    overall = "warning";
  }

  // 霊核安定度計算（簡略版）
  // TODO: 実際の霊核状態に基づいて計算
  const reiCoreStability = Math.max(0, 100 - errorCount * 5);

  return {
    overall,
    components: {
      database: databaseHealth,
      api: "healthy", // TODO: 実際のAPI状態をチェック
      selfBuild: "healthy", // TODO: 実際のSelf-Build状態をチェック
      selfHeal: "healthy", // TODO: 実際のSelf-Heal状態をチェック
      selfEvolution: "healthy", // TODO: 実際のSelf-Evolution状態をチェック
      coDevGateway: "healthy", // TODO: 実際のCo-Dev Gateway状態をチェック
    },
    metrics: {
      uptime: process.uptime(),
      errorCount,
      repairCount: 0, // TODO: 実際の修復数を取得
      evolutionCount: 0, // TODO: 実際の進化数を取得
      lastCheck: new Date(),
    },
    reiCoreStability,
  };
}

/**
 * アラートを作成
 */
async function createAlert(alert: MonitorAlert): Promise<void> {
  alerts.push(alert);

  // 最新100件のみ保持
  if (alerts.length > 100) {
    alerts.shift();
  }

  console.log(`[Autonomous Monitor] Alert: [${alert.level}] ${alert.component}: ${alert.message}`);

  // TODO: 天聞への通知
  // TODO: 自動修復の試行
}

/**
 * アラート履歴を取得
 */
export function getAlerts(limit: number = 50): MonitorAlert[] {
  return alerts.slice(-limit);
}

/**
 * 監視状態を取得
 */
export function getMonitoringStatus(): {
  active: boolean;
  alertCount: number;
  lastCheck: Date | null;
} {
  return {
    active: monitoringActive,
    alertCount: alerts.length,
    lastCheck: alerts.length > 0 ? alerts[alerts.length - 1]!.timestamp : null,
  };
}
