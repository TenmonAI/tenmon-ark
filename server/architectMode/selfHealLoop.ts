/**
 * Self-Heal Loop
 * 
 * TENMON-ARK自身が自己診断・自己修復を行うエンドレス進化ループ
 * 
 * フロー:
 * 1. Self-Diagnostics（自己診断） → architectModeCore.analyzeSystem()
 * 2. Self-Report（Manusへ報告） → tenmonToManusLink.sendDiagnosticsReport()
 * 3. Self-Patch（Manusが実装） → manusToTenmonLink.receiveFixInstruction()
 * 4. Self-Verify（TENMON-ARKが再確認） → manusToTenmonLink.verifyFix()
 * 5. ループ継続
 */

import { architectModeCore } from "./architectModeCore";
import { tenmonToManusLink } from "./tenmonToManusLink";
import { manusToTenmonLink } from "./manusToTenmonLink";
import type { DiagnosticsReport } from "./architectModeCore";

/**
 * Self-Heal Loopの状態
 */
export interface SelfHealLoopStatus {
  isRunning: boolean;
  lastDiagnosticsTime: Date | null;
  lastReportTime: Date | null;
  lastVerificationTime: Date | null;
  totalCycles: number;
  totalIssuesDetected: number;
  totalIssuesFixed: number;
  currentHealth: number;
  averageHealth: number;
}

/**
 * Self-Heal Loop Manager
 */
class SelfHealLoopManager {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private loopIntervalMs = 60 * 60 * 1000; // 1時間ごと

  private lastDiagnosticsTime: Date | null = null;
  private lastReportTime: Date | null = null;
  private lastVerificationTime: Date | null = null;

  private totalCycles = 0;
  private totalIssuesDetected = 0;
  private totalIssuesFixed = 0;

  private healthHistory: number[] = [];
  private maxHealthHistorySize = 100;

  /**
   * Self-Heal Loopを開始
   */
  start(intervalMs: number = this.loopIntervalMs): void {
    if (this.isRunning) {
      console.log("[Self-Heal Loop] Already running");
      return;
    }

    console.log(`[Self-Heal Loop] Starting with interval: ${intervalMs}ms`);
    this.isRunning = true;
    this.loopIntervalMs = intervalMs;

    // 初回実行
    this.runCycle();

    // 定期実行
    this.intervalId = setInterval(() => {
      this.runCycle();
    }, intervalMs);
  }

  /**
   * Self-Heal Loopを停止
   */
  stop(): void {
    if (!this.isRunning) {
      console.log("[Self-Heal Loop] Not running");
      return;
    }

    console.log("[Self-Heal Loop] Stopping");
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 1サイクルを実行
   */
  private async runCycle(): Promise<void> {
    console.log(`[Self-Heal Loop] Running cycle ${this.totalCycles + 1}`);

    try {
      // 1. Self-Diagnostics（自己診断）
      const report = await this.selfDiagnostics();

      // 2. Self-Report（Manusへ報告）
      if (report.criticalIssues > 0 || report.highIssues > 0) {
        await this.selfReport(report);
      }

      // 3. Self-Patch & Self-Verify は Manusが修正を実施したときに自動実行される

      // サイクル完了
      this.totalCycles++;
      this.healthHistory.push(report.overallHealth);

      // 履歴サイズを制限
      if (this.healthHistory.length > this.maxHealthHistorySize) {
        this.healthHistory.shift();
      }

      console.log(`[Self-Heal Loop] Cycle ${this.totalCycles} completed. Health: ${report.overallHealth}/100`);
    } catch (error) {
      console.error("[Self-Heal Loop] Error during cycle:", error);
    }
  }

  /**
   * 1. Self-Diagnostics（自己診断）
   */
  private async selfDiagnostics(): Promise<DiagnosticsReport> {
    console.log("[Self-Heal Loop] Step 1: Self-Diagnostics");

    const report = await architectModeCore.analyzeSystem();
    this.lastDiagnosticsTime = new Date();
    this.totalIssuesDetected += report.totalIssues;

    console.log(`[Self-Heal Loop] Detected ${report.totalIssues} issues (Critical: ${report.criticalIssues}, High: ${report.highIssues})`);

    return report;
  }

  /**
   * 2. Self-Report（Manusへ報告）
   */
  private async selfReport(report: DiagnosticsReport): Promise<void> {
    console.log("[Self-Heal Loop] Step 2: Self-Report");

    const success = await tenmonToManusLink.sendDiagnosticsReport(report);
    if (success) {
      this.lastReportTime = new Date();
      console.log("[Self-Heal Loop] Report sent to Manus");
    } else {
      console.error("[Self-Heal Loop] Failed to send report to Manus");
    }
  }

  /**
   * 3. Self-Patch（Manusが実装）
   * 
   * この関数は直接呼ばれず、Manusが修正を実施したときに
   * manusToTenmonLink.receiveFixInstruction() が呼ばれる
   */

  /**
   * 4. Self-Verify（TENMON-ARKが再確認）
   * 
   * この関数は直接呼ばれず、Manusが修正を実施したときに
   * manusToTenmonLink.verifyFix() が呼ばれる
   */

  /**
   * Self-Heal Loopの状態を取得
   */
  getStatus(): SelfHealLoopStatus {
    const currentHealth = this.healthHistory.length > 0
      ? this.healthHistory[this.healthHistory.length - 1]
      : 0;

    const averageHealth = this.healthHistory.length > 0
      ? this.healthHistory.reduce((sum, h) => sum + h, 0) / this.healthHistory.length
      : 0;

    return {
      isRunning: this.isRunning,
      lastDiagnosticsTime: this.lastDiagnosticsTime,
      lastReportTime: this.lastReportTime,
      lastVerificationTime: this.lastVerificationTime,
      totalCycles: this.totalCycles,
      totalIssuesDetected: this.totalIssuesDetected,
      totalIssuesFixed: this.totalIssuesFixed,
      currentHealth,
      averageHealth,
    };
  }

  /**
   * 健全性履歴を取得
   */
  getHealthHistory(): number[] {
    return this.healthHistory;
  }

  /**
   * 修正完了を記録（Manusが修正を実施したときに呼ばれる）
   */
  recordFixCompletion(): void {
    this.totalIssuesFixed++;
    this.lastVerificationTime = new Date();
  }
}

/**
 * Self-Heal Loop Managerのシングルトンインスタンス
 */
export const selfHealLoop = new SelfHealLoopManager();
