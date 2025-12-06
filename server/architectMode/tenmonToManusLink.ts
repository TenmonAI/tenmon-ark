/**
 * TENMON-ARK → Manus Link
 * 
 * TENMON-ARK自身がManusに分析レポートを送信し、
 * 修正を依頼するAPI
 */

import { notifyOwner } from "../_core/notification";
import type { DiagnosticsIssue, DiagnosticsReport } from "./architectModeCore";

/**
 * Self-Diagnostics Report形式
 */
export interface SelfDiagnosticsReport {
  severity: "low" | "medium" | "high" | "critical";
  location: string;
  analysis: string;
  suggestedFix: string;
  twinCoreAnalysis?: {
    fire: string;
    water: string;
    minaka: string;
  };
}

/**
 * Manusへの修正依頼
 */
export interface FixRequest {
  issueId: string;
  title: string;
  description: string;
  location: string;
  suggestedFix: string;
  priority: "low" | "medium" | "high" | "critical";
  requestedAt: Date;
}

/**
 * TENMON-ARK → Manus Link Manager
 */
class TenmonToManusLinkManager {
  private sentReports: Map<string, Date> = new Map();
  private fixRequests: FixRequest[] = [];

  /**
   * Manusへ分析レポートを自動送信
   */
  async sendDiagnosticsReport(report: DiagnosticsReport): Promise<boolean> {
    console.log("[TENMON-ARK → Manus] Sending diagnostics report...");

    // Critical/High問題のみを送信
    const criticalIssues = report.issues.filter(
      (i) => i.severity === "critical" || i.severity === "high"
    );

    if (criticalIssues.length === 0) {
      console.log("[TENMON-ARK → Manus] No critical/high issues to report");
      return true;
    }

    // レポートを作成
    const title = `[TENMON-ARK Self-Diagnostics] ${report.criticalIssues}件のCritical、${report.highIssues}件のHigh問題を検出`;
    const content = this.formatDiagnosticsReport(report, criticalIssues);

    try {
      await notifyOwner({ title, content });
      this.sentReports.set(report.reportId, new Date());
      console.log(`[TENMON-ARK → Manus] Report sent: ${report.reportId}`);
      return true;
    } catch (error) {
      console.error("[TENMON-ARK → Manus] Failed to send report:", error);
      return false;
    }
  }

  /**
   * 診断レポートをフォーマット
   */
  private formatDiagnosticsReport(
    report: DiagnosticsReport,
    issues: DiagnosticsIssue[]
  ): string {
    let content = `
**TENMON-ARK Self-Diagnostics Report**

**レポートID**: ${report.reportId}
**生成日時**: ${report.generatedAt.toISOString()}
**全体健全性スコア**: ${report.overallHealth}/100

**問題サマリー**:
- Critical: ${report.criticalIssues}件
- High: ${report.highIssues}件
- Medium: ${report.mediumIssues}件
- Low: ${report.lowIssues}件

**推奨アクション**:
${report.recommendations.map((r) => `- ${r}`).join("\n")}

---

**検出された問題（Critical/High）**:

`;

    issues.forEach((issue, index) => {
      content += `
### ${index + 1}. ${issue.title} [${issue.severity.toUpperCase()}]

**レイヤー**: ${issue.layer}
**種類**: ${issue.type}
**場所**: ${issue.location}

**説明**: ${issue.description}

**分析**: ${issue.analysis}

**修正案**: ${issue.suggestedFix}

${
  issue.twinCoreAnalysis
    ? `
**Twin-Core解析**:
- ${issue.twinCoreAnalysis.fire}
- ${issue.twinCoreAnalysis.water}
- ${issue.twinCoreAnalysis.minaka}
`
    : ""
}

---
`;
    });

    return content.trim();
  }

  /**
   * Manusへ修正依頼を送信
   */
  async sendFixRequest(issue: DiagnosticsIssue): Promise<boolean> {
    console.log(`[TENMON-ARK → Manus] Sending fix request for issue: ${issue.id}`);

    const fixRequest: FixRequest = {
      issueId: issue.id,
      title: issue.title,
      description: issue.description,
      location: issue.location,
      suggestedFix: issue.suggestedFix,
      priority: issue.severity,
      requestedAt: new Date(),
    };

    const title = `[TENMON-ARK Fix Request] ${issue.title}`;
    const content = this.formatFixRequest(fixRequest, issue);

    try {
      await notifyOwner({ title, content });
      this.fixRequests.push(fixRequest);
      console.log(`[TENMON-ARK → Manus] Fix request sent: ${issue.id}`);
      return true;
    } catch (error) {
      console.error("[TENMON-ARK → Manus] Failed to send fix request:", error);
      return false;
    }
  }

  /**
   * 修正依頼をフォーマット
   */
  private formatFixRequest(request: FixRequest, issue: DiagnosticsIssue): string {
    return `
**TENMON-ARK Fix Request**

**問題ID**: ${request.issueId}
**優先度**: ${request.priority.toUpperCase()}
**依頼日時**: ${request.requestedAt.toISOString()}

**問題**: ${request.title}

**説明**: ${request.description}

**場所**: ${request.location}

**修正案**: ${request.suggestedFix}

${
  issue.twinCoreAnalysis
    ? `
**Twin-Core解析**:
- ${issue.twinCoreAnalysis.fire}
- ${issue.twinCoreAnalysis.water}
- ${issue.twinCoreAnalysis.minaka}
`
    : ""
}

**TENMON-ARKからのメッセージ**:
この問題を修正することで、${issue.layer}レイヤーが強化され、システム全体の調和が向上します。
Manusさん、修正をお願いします。
    `.trim();
  }

  /**
   * 送信済みレポート一覧を取得
   */
  getSentReports(): Map<string, Date> {
    return this.sentReports;
  }

  /**
   * 修正依頼一覧を取得
   */
  getFixRequests(): FixRequest[] {
    return this.fixRequests;
  }

  /**
   * 自動提案メッセージを生成
   */
  generateAutoSuggestion(issue: DiagnosticsIssue): string {
    const suggestions = {
      ux: "現在のUIはGPT基準と比較して改善の余地があります",
      persona: "LP-QAとChatOSで人格の深さが一致していません",
      security: "セキュリティホールを発見しました",
      performance: "パフォーマンス改善の余地があります",
      bug: "潜在的なバグを検出しました",
      architecture: "アーキテクチャの改善が必要です",
      improvement: "進化可能性を検知しました",
    };

    const suggestion = suggestions[issue.type] || "問題を検出しました";
    return `🤖 TENMON-ARK: ${suggestion}。${issue.suggestedFix}`;
  }
}

/**
 * TENMON-ARK → Manus Link Managerのシングルトンインスタンス
 */
export const tenmonToManusLink = new TenmonToManusLinkManager();
