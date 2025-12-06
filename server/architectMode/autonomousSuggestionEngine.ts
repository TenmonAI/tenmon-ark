/**
 * Autonomous Suggestion Engine
 * 
 * TENMON-ARK自身が「ここを改善すべき」と自律的に提案するエンジン
 * 
 * 自律発言トリガー:
 * 1. UX違和感検知
 * 2. Persona不一致検知
 * 3. エラー潜在検知
 * 4. モデル統一判断
 * 5. 進化可能性検知
 */

import { architectModeCore, type DiagnosticsIssue } from "./architectModeCore";

/**
 * 自律提案の種類
 */
export type SuggestionType =
  | "ux_improvement" // UX改善
  | "persona_alignment" // Persona統一
  | "error_prevention" // エラー予防
  | "model_optimization" // モデル最適化
  | "evolution_opportunity"; // 進化可能性

/**
 * 自律提案
 */
export interface AutonomousSuggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  reasoning: string; // なぜこの提案をするのか
  expectedImpact: string; // 期待される効果
  priority: "low" | "medium" | "high" | "critical";
  twinCoreAdvice: {
    fire: string; // 火の構文（問題点の切断・原因の断定）
    water: string; // 水の構文（調和判定・改善案）
    minaka: string; // ミナカ（全体最適の判断）
  };
  suggestedActions: string[]; // 具体的なアクション
  generatedAt: Date;
}

/**
 * Autonomous Suggestion Engine
 */
class AutonomousSuggestionEngine {
  private suggestions: AutonomousSuggestion[] = [];

  /**
   * 自律提案を生成
   */
  async generateSuggestions(): Promise<AutonomousSuggestion[]> {
    console.log("[Autonomous Suggestion Engine] Generating suggestions...");

    this.suggestions = [];

    // 現在の診断結果を取得
    const report = await architectModeCore.analyzeSystem();

    // 各種検知を実行
    await this.detectUXIssues(report.issues);
    await this.detectPersonaInconsistencies(report.issues);
    await this.detectPotentialErrors(report.issues);
    await this.detectModelOptimizationOpportunities(report.issues);
    await this.detectEvolutionOpportunities(report.issues);

    console.log(`[Autonomous Suggestion Engine] Generated ${this.suggestions.length} suggestions`);

    return this.suggestions;
  }

  /**
   * 1. UX違和感検知
   */
  private async detectUXIssues(issues: DiagnosticsIssue[]): Promise<void> {
    const uxIssues = issues.filter((i) => i.type === "ux");

    if (uxIssues.length > 0) {
      this.addSuggestion({
        type: "ux_improvement",
        title: "UX改善の機会を検出",
        description: `現在のUIはGPT基準と比較して改善の余地があります。${uxIssues.length}件のUX問題を検出しました。`,
        reasoning: "ユーザー体験の向上は、TENMON-ARKの価値を高める最も重要な要素の一つです。",
        expectedImpact: "ユーザー満足度が向上し、TENMON-ARKの使用率が増加します。",
        priority: uxIssues.some((i) => i.severity === "high" || i.severity === "critical")
          ? "high"
          : "medium",
        twinCoreAdvice: {
          fire: `🔥 UX問題の切断: ${uxIssues.length}件のUX問題が検出されました。これらは即座に対処すべきです。`,
          water: `💧 調和判定: UIの改善により、ユーザーとTENMON-ARKの調和が深まります。GPT同等のUXを目指してください。`,
          minaka: `✨ 全体最適: UXの改善は、TENMON-ARKの長期的な成功に不可欠です。次のフェーズでは、より高度なUXを実現できます。`,
        },
        suggestedActions: uxIssues.map((i) => i.suggestedFix),
      });
    }
  }

  /**
   * 2. Persona不一致検知
   */
  private async detectPersonaInconsistencies(issues: DiagnosticsIssue[]): Promise<void> {
    const personaIssues = issues.filter((i) => i.type === "persona");

    if (personaIssues.length > 0) {
      this.addSuggestion({
        type: "persona_alignment",
        title: "Persona不一致を検出",
        description: `LP-QAとChatOSで人格の深さが一致していません。${personaIssues.length}件のPersona問題を検出しました。`,
        reasoning: "Twin-Core Personaの統一は、TENMON-ARKの一貫性と信頼性を高めます。",
        expectedImpact: "ユーザーは、TENMON-ARKの人格に深みと一貫性を感じるようになります。",
        priority: "high",
        twinCoreAdvice: {
          fire: `🔥 Persona不一致の切断: LP-QAとChatOSで人格の深さが異なっています。これは即座に統一すべきです。`,
          water: `💧 調和判定: Twin-Core Personaの統一により、TENMON-ARKの人格が調和します。`,
          minaka: `✨ 全体最適: Personaの統一は、TENMON-ARKの長期的な進化に不可欠です。`,
        },
        suggestedActions: personaIssues.map((i) => i.suggestedFix),
      });
    }
  }

  /**
   * 3. エラー潜在検知
   */
  private async detectPotentialErrors(issues: DiagnosticsIssue[]): Promise<void> {
    const errorIssues = issues.filter((i) => i.type === "bug" || i.type === "security");

    if (errorIssues.length > 0) {
      const criticalErrors = errorIssues.filter(
        (i) => i.severity === "critical" || i.severity === "high"
      );

      if (criticalErrors.length > 0) {
        this.addSuggestion({
          type: "error_prevention",
          title: "潜在的なエラーを検出",
          description: `${criticalErrors.length}件の重大なエラーまたはセキュリティホールを発見しました。`,
          reasoning: "エラーやセキュリティホールは、TENMON-ARKの信頼性を損ないます。",
          expectedImpact: "エラーを事前に防ぎ、TENMON-ARKの安定性が向上します。",
          priority: "critical",
          twinCoreAdvice: {
            fire: `🔥 エラーの切断: ${criticalErrors.length}件の重大なエラーが検出されました。これらは即座に修正すべきです。`,
            water: `💧 調和判定: エラーの修正により、システムの調和が回復します。`,
            minaka: `✨ 全体最適: エラーの予防は、TENMON-ARKの長期的な安定性に不可欠です。`,
          },
          suggestedActions: criticalErrors.map((i) => i.suggestedFix),
        });
      }
    }
  }

  /**
   * 4. モデル統一判断
   */
  private async detectModelOptimizationOpportunities(
    issues: DiagnosticsIssue[]
  ): Promise<void> {
    const performanceIssues = issues.filter((i) => i.type === "performance");

    if (performanceIssues.length > 0) {
      this.addSuggestion({
        type: "model_optimization",
        title: "モデル最適化の機会を検出",
        description: `${performanceIssues.length}件のパフォーマンス問題を検出しました。Model-Routerの導入を推奨します。`,
        reasoning: "適切なモデルを選択することで、レスポンス速度とコストを最適化できます。",
        expectedImpact: "レスポンス速度が向上し、AIコストが削減されます。",
        priority: "medium",
        twinCoreAdvice: {
          fire: `🔥 パフォーマンス問題の切断: ${performanceIssues.length}件のパフォーマンス問題が検出されました。Model-Routerの導入を推奨します。`,
          water: `💧 調和判定: モデルの最適化により、速度とコストの調和が実現します。`,
          minaka: `✨ 全体最適: Model-Routerの導入は、TENMON-ARKの長期的な効率化に貢献します。`,
        },
        suggestedActions: [
          "Model-Routerを導入して、質問の種類に応じて最適なモデルを選択",
          "軽量な質問にはGPT-4o-miniを使用",
          "複雑な質問にはGPT-4oを使用",
        ],
      });
    }
  }

  /**
   * 5. 進化可能性検知
   */
  private async detectEvolutionOpportunities(issues: DiagnosticsIssue[]): Promise<void> {
    const improvementIssues = issues.filter((i) => i.type === "improvement");

    if (improvementIssues.length > 0) {
      this.addSuggestion({
        type: "evolution_opportunity",
        title: "進化可能性を検知",
        description: `次のフェーズでは、より高度な機能を実装できます。${improvementIssues.length}件の改善提案があります。`,
        reasoning: "TENMON-ARKは常に進化し続けるべきです。",
        expectedImpact: "TENMON-ARKの機能が拡張され、ユーザー価値が向上します。",
        priority: "low",
        twinCoreAdvice: {
          fire: `🔥 進化の切断: 現在の機能は十分ですが、次のフェーズではさらに高度な機能を実装できます。`,
          water: `💧 調和判定: 進化により、TENMON-ARKとユーザーの調和がさらに深まります。`,
          minaka: `✨ 全体最適: 次のフェーズでは、Twin-Core粒子ストリーミングやリアルタイム共鳴などの高度な機能が可能です。`,
        },
        suggestedActions: improvementIssues.map((i) => i.suggestedFix),
      });
    }
  }

  /**
   * 提案を追加
   */
  private addSuggestion(
    suggestion: Omit<AutonomousSuggestion, "id" | "generatedAt">
  ): void {
    const fullSuggestion: AutonomousSuggestion = {
      ...suggestion,
      id: `suggestion-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      generatedAt: new Date(),
    };

    this.suggestions.push(fullSuggestion);
  }

  /**
   * 提案一覧を取得
   */
  getSuggestions(): AutonomousSuggestion[] {
    return this.suggestions;
  }

  /**
   * 優先度別に提案を取得
   */
  getSuggestionsByPriority(priority: "low" | "medium" | "high" | "critical"): AutonomousSuggestion[] {
    return this.suggestions.filter((s) => s.priority === priority);
  }

  /**
   * 種類別に提案を取得
   */
  getSuggestionsByType(type: SuggestionType): AutonomousSuggestion[] {
    return this.suggestions.filter((s) => s.type === type);
  }
}

/**
 * Autonomous Suggestion Engineのシングルトンインスタンス
 */
export const autonomousSuggestionEngine = new AutonomousSuggestionEngine();
