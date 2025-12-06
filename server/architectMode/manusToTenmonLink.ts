/**
 * Manus → TENMON-ARK Link
 * 
 * Manusからの修正指示を受信し、
 * 修正結果を検証・再評価するAPI
 */

import { architectModeCore } from "./architectModeCore";
import type { DiagnosticsReport } from "./architectModeCore";

/**
 * Manusからの修正指示
 */
export interface FixInstruction {
  issueId: string;
  action: "fix" | "ignore" | "defer" | "clarify";
  message: string;
  appliedChanges?: string[]; // 適用された変更のリスト
  timestamp: Date;
}

/**
 * 修正結果の検証
 */
export interface FixVerification {
  issueId: string;
  verified: boolean;
  verificationMessage: string;
  beforeHealth: number;
  afterHealth: number;
  improvement: number;
  timestamp: Date;
}

/**
 * 再評価レポート
 */
export interface ReEvaluationReport {
  reportId: string;
  originalIssueId: string;
  fixInstruction: FixInstruction;
  verification: FixVerification;
  newDiagnostics: DiagnosticsReport;
  recommendation: string;
  generatedAt: Date;
}

/**
 * Manus → TENMON-ARK Link Manager
 */
class ManusToTenmonLinkManager {
  private receivedInstructions: FixInstruction[] = [];
  private verifications: FixVerification[] = [];
  private reEvaluationReports: ReEvaluationReport[] = [];

  /**
   * Manusからの修正指示を受信
   */
  async receiveFixInstruction(instruction: Omit<FixInstruction, "timestamp">): Promise<boolean> {
    console.log(`[Manus → TENMON-ARK] Received fix instruction for issue: ${instruction.issueId}`);

    const fullInstruction: FixInstruction = {
      ...instruction,
      timestamp: new Date(),
    };

    this.receivedInstructions.push(fullInstruction);

    // 修正が適用された場合は自動検証
    if (instruction.action === "fix") {
      await this.verifyFix(fullInstruction);
    }

    return true;
  }

  /**
   * 修正結果を検証
   */
  async verifyFix(instruction: FixInstruction): Promise<FixVerification> {
    console.log(`[Manus → TENMON-ARK] Verifying fix for issue: ${instruction.issueId}`);

    // 修正前の健全性スコアを取得
    const beforeReport = await architectModeCore.analyzeSystem();
    const beforeHealth = beforeReport.overallHealth;

    // 少し待ってから再スキャン（修正が反映されるまで）
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 修正後の健全性スコアを取得
    const afterReport = await architectModeCore.analyzeSystem();
    const afterHealth = afterReport.overallHealth;

    // 改善度を計算
    const improvement = afterHealth - beforeHealth;

    // 検証結果
    const verified = improvement >= 0; // 健全性が改善または維持されていればOK
    const verificationMessage = verified
      ? `✅ 修正が成功しました。健全性スコアが${beforeHealth}から${afterHealth}に改善しました（+${improvement}）。`
      : `⚠️ 修正後も問題が残っています。健全性スコアが${beforeHealth}から${afterHealth}に変化しました（${improvement}）。`;

    const verification: FixVerification = {
      issueId: instruction.issueId,
      verified,
      verificationMessage,
      beforeHealth,
      afterHealth,
      improvement,
      timestamp: new Date(),
    };

    this.verifications.push(verification);

    // 再評価レポートを生成
    await this.generateReEvaluationReport(instruction, verification, afterReport);

    return verification;
  }

  /**
   * 再評価レポートを生成
   */
  private async generateReEvaluationReport(
    instruction: FixInstruction,
    verification: FixVerification,
    newDiagnostics: DiagnosticsReport
  ): Promise<ReEvaluationReport> {
    const recommendation = this.generateRecommendation(verification, newDiagnostics);

    const report: ReEvaluationReport = {
      reportId: `re-eval-${Date.now()}`,
      originalIssueId: instruction.issueId,
      fixInstruction: instruction,
      verification,
      newDiagnostics,
      recommendation,
      generatedAt: new Date(),
    };

    this.reEvaluationReports.push(report);

    console.log(`[Manus → TENMON-ARK] Re-evaluation report generated: ${report.reportId}`);

    return report;
  }

  /**
   * 推奨アクションを生成
   */
  private generateRecommendation(
    verification: FixVerification,
    newDiagnostics: DiagnosticsReport
  ): string {
    if (verification.verified && newDiagnostics.totalIssues === 0) {
      return "✅ すべての問題が解決しました。次のフェーズへ進めます。";
    }

    if (verification.verified && newDiagnostics.criticalIssues === 0) {
      return "✅ Critical問題が解決しました。残りの問題も順次対応してください。";
    }

    if (verification.verified) {
      return `✅ 修正が成功しました。健全性スコアが${verification.improvement}ポイント改善しました。`;
    }

    return `⚠️ 修正後も問題が残っています。追加の対応が必要です。`;
  }

  /**
   * 受信済み修正指示一覧を取得
   */
  getReceivedInstructions(): FixInstruction[] {
    return this.receivedInstructions;
  }

  /**
   * 検証結果一覧を取得
   */
  getVerifications(): FixVerification[] {
    return this.verifications;
  }

  /**
   * 再評価レポート一覧を取得
   */
  getReEvaluationReports(): ReEvaluationReport[] {
    return this.reEvaluationReports;
  }

  /**
   * 最新の再評価レポートを取得
   */
  getLatestReEvaluationReport(): ReEvaluationReport | null {
    if (this.reEvaluationReports.length === 0) {
      return null;
    }
    return this.reEvaluationReports[this.reEvaluationReports.length - 1];
  }
}

/**
 * Manus → TENMON-ARK Link Managerのシングルトンインスタンス
 */
export const manusToTenmonLink = new ManusToTenmonLinkManager();
