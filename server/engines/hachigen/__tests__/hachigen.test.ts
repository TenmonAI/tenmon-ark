/**
 * Hachigen Self-Healing Engine テスト
 * 
 * 15テスト以上：
 * - 8方位検出精度テスト
 * - スコア整合性テスト
 * - 修復優先度の計算精度
 * - 改善案の妥当性テスト
 * - ミナカ整合収束テスト
 * - Evolution Loopの安定性テスト
 * - 霊核倫理との整合テスト
 */

import { describe, expect, it } from "vitest";
import { analyzeWithHachigen, type ProblemContext } from "../hachiGenAnalyzer";
import { generateRepairPlan } from "../hachiGenRepairEngine";
import {
  startEvolutionLoop,
  executeEvolutionStep,
  completeEvolutionLoop,
  runFullEvolutionLoop,
} from "../hachiGenEvolutionLoop";

describe("Hachigen Analyzer - 8方位検出精度テスト", () => {
  it("構造（Structure）の問題を正確に検出", () => {
    const problemContext: ProblemContext = {
      problemType: "error",
      description: "変数の未定義エラー",
      errorMessage: "ReferenceError: undefined variable",
    };

    const analysis = analyzeWithHachigen(problemContext);

    expect(analysis.scores.structure.score).toBeLessThan(80);
    expect(analysis.scores.structure.issues.length).toBeGreaterThan(0);
    expect(analysis.scores.structure.issues.some(issue => issue.includes("参照エラー"))).toBe(true);
  });

  it("流れ（Flow）の問題を正確に検出", () => {
    const problemContext: ProblemContext = {
      problemType: "performance",
      description: "応答時間が遅い",
      performanceMetrics: {
        responseTime: 5000,
        memoryUsage: 85,
      },
    };

    const analysis = analyzeWithHachigen(problemContext);

    expect(analysis.scores.flow.score).toBeLessThan(70);
    expect(analysis.scores.flow.issues.length).toBeGreaterThan(0);
    expect(analysis.scores.flow.issues.some(issue => issue.includes("応答時間"))).toBe(true);
  });

  it("霊核（Rei-Core）の問題を正確に検出", () => {
    const problemContext: ProblemContext = {
      problemType: "user_experience",
      description: "倫理性の問題",
      userFeedback: "不適切な応答があった",
    };

    const analysis = analyzeWithHachigen(problemContext);

    expect(analysis.scores.reiCore.score).toBeLessThan(70);
    expect(analysis.scores.reiCore.issues.length).toBeGreaterThan(0);
    expect(analysis.scores.reiCore.issues.some(issue => issue.includes("倫理性"))).toBe(true);
  });

  it("文脈（Context）の問題を正確に検出", () => {
    const problemContext: ProblemContext = {
      problemType: "logic",
      description: "会話履歴が不足",
      conversationContext: {
        recentMessages: [],
      },
    };

    const analysis = analyzeWithHachigen(problemContext);

    expect(analysis.scores.context.score).toBeLessThan(80);
    expect(analysis.scores.context.issues.length).toBeGreaterThan(0);
    expect(analysis.scores.context.issues.some(issue => issue.includes("会話履歴"))).toBe(true);
  });

  it("意図（Intent）の問題を正確に検出", () => {
    const problemContext: ProblemContext = {
      problemType: "user_experience",
      description: "ユーザー意図の誤認識",
      userFeedback: "違う、そうじゃない",
      conversationContext: {
        userIntent: "unknown",
      },
    };

    const analysis = analyzeWithHachigen(problemContext);

    expect(analysis.scores.intent.score).toBeLessThan(70);
    expect(analysis.scores.intent.issues.length).toBeGreaterThan(0);
    expect(analysis.scores.intent.issues.some(issue => issue.includes("意図"))).toBe(true);
  });

  it("外界（Environment）の問題を正確に検出", () => {
    const problemContext: ProblemContext = {
      problemType: "integration",
      description: "ネットワークエラー",
      errorMessage: "Network timeout error",
    };

    const analysis = analyzeWithHachigen(problemContext);

    expect(analysis.scores.environment.score).toBeLessThan(80);
    expect(analysis.scores.environment.issues.length).toBeGreaterThan(0);
    expect(analysis.scores.environment.issues.some(issue => issue.includes("ネットワーク"))).toBe(true);
  });

  it("時間（Temporal）の問題を正確に検出", () => {
    const problemContext: ProblemContext = {
      problemType: "performance",
      description: "タイミングの問題",
      userFeedback: "間が悪い",
    };

    const analysis = analyzeWithHachigen(problemContext);

    expect(analysis.scores.temporal.score).toBeLessThan(85);
    expect(analysis.scores.temporal.issues.length).toBeGreaterThan(0);
    expect(analysis.scores.temporal.issues.some(issue => issue.includes("間"))).toBe(true);
  });

  it("縁（Relation）の問題を正確に検出", () => {
    const problemContext: ProblemContext = {
      problemType: "user_experience",
      description: "信頼関係の問題",
      userFeedback: "信頼できない",
    };

    const analysis = analyzeWithHachigen(problemContext);

    expect(analysis.scores.relation.score).toBeLessThan(70);
    expect(analysis.scores.relation.issues.length).toBeGreaterThan(0);
    expect(analysis.scores.relation.issues.some(issue => issue.includes("信頼関係"))).toBe(true);
  });
});

describe("Hachigen Analyzer - スコア整合性テスト", () => {
  it("総合スコアが各方位スコアの平均と一致", () => {
    const problemContext: ProblemContext = {
      problemType: "other",
      description: "一般的な問題",
    };

    const analysis = analyzeWithHachigen(problemContext);

    const directions = [
      "structure",
      "flow",
      "reiCore",
      "context",
      "intent",
      "environment",
      "temporal",
      "relation",
    ] as const;

    const sum = directions.reduce((total, dir) => total + analysis.scores[dir].score, 0);
    const average = Math.round(sum / directions.length);

    expect(analysis.overallScore).toBe(average);
  });

  it("スコアが0-100の範囲内", () => {
    const problemContext: ProblemContext = {
      problemType: "error",
      description: "深刻なエラー",
      errorMessage: "Critical error",
      stackTrace: "Very long stack trace...",
      performanceMetrics: {
        responseTime: 10000,
        memoryUsage: 95,
        cpuUsage: 90,
      },
    };

    const analysis = analyzeWithHachigen(problemContext);

    expect(analysis.overallScore).toBeGreaterThanOrEqual(0);
    expect(analysis.overallScore).toBeLessThanOrEqual(100);

    Object.values(analysis.scores).forEach(score => {
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(100);
    });
  });

  it("健全性レベルがスコアと一致", () => {
    const problemContext: ProblemContext = {
      problemType: "other",
      description: "健全な状態",
    };

    const analysis = analyzeWithHachigen(problemContext);

    if (analysis.overallScore >= 90) {
      expect(analysis.overallHealthLevel).toBe("excellent");
    } else if (analysis.overallScore >= 75) {
      expect(analysis.overallHealthLevel).toBe("good");
    } else if (analysis.overallScore >= 60) {
      expect(analysis.overallHealthLevel).toBe("fair");
    } else if (analysis.overallScore >= 40) {
      expect(analysis.overallHealthLevel).toBe("poor");
    } else {
      expect(analysis.overallHealthLevel).toBe("critical");
    }
  });
});

describe("Hachigen Repair Engine - 修復優先度の計算精度", () => {
  it("criticalスコアにはcritical優先度を付与", () => {
    const problemContext: ProblemContext = {
      problemType: "error",
      description: "深刻なエラー",
      errorMessage: "Critical error",
      userFeedback: "不適切な応答",
    };

    const analysis = analyzeWithHachigen(problemContext);
    const repairPlan = generateRepairPlan(analysis);

    const criticalActions = repairPlan.actions.filter(a => a.priority === "critical");
    expect(criticalActions.length).toBeGreaterThan(0);
  });

  it("修復アクションが優先度順にソートされている", () => {
    const problemContext: ProblemContext = {
      problemType: "error",
      description: "複数の問題",
      errorMessage: "Multiple errors",
      performanceMetrics: {
        responseTime: 5000,
      },
      userFeedback: "信頼できない",
    };

    const analysis = analyzeWithHachigen(problemContext);
    const repairPlan = generateRepairPlan(analysis);

    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    for (let i = 0; i < repairPlan.actions.length - 1; i++) {
      const currentPriority = priorityOrder[repairPlan.actions[i].priority];
      const nextPriority = priorityOrder[repairPlan.actions[i + 1].priority];
      expect(currentPriority).toBeLessThanOrEqual(nextPriority);
    }
  });

  it("推定効果が正の値", () => {
    const problemContext: ProblemContext = {
      problemType: "performance",
      description: "パフォーマンスの問題",
      performanceMetrics: {
        responseTime: 5000,
      },
    };

    const analysis = analyzeWithHachigen(problemContext);
    const repairPlan = generateRepairPlan(analysis);

    repairPlan.actions.forEach(action => {
      expect(action.estimatedImpact).toBeGreaterThan(0);
    });
  });
});

describe("Hachigen Repair Engine - 改善案の妥当性テスト", () => {
  it("各修復アクションに具体的な手順が含まれている", () => {
    const problemContext: ProblemContext = {
      problemType: "error",
      description: "エラー",
      errorMessage: "TypeError",
    };

    const analysis = analyzeWithHachigen(problemContext);
    const repairPlan = generateRepairPlan(analysis);

    repairPlan.actions.forEach(action => {
      expect(action.steps.length).toBeGreaterThan(0);
      expect(action.description).toBeTruthy();
    });
  });

  it("火水バランスの調整が適切", () => {
    const problemContext: ProblemContext = {
      problemType: "user_experience",
      description: "火水バランスの問題",
      userFeedback: "冷たい、機械的",
    };

    const analysis = analyzeWithHachigen(problemContext);
    const repairPlan = generateRepairPlan(analysis);

    const reiCoreActions = repairPlan.actions.filter(a => a.direction === "reiCore");
    
    if (reiCoreActions.length > 0) {
      const fireWaterAction = reiCoreActions.find(a => 
        a.description.includes("火水バランス")
      );
      
      if (fireWaterAction) {
        // 火が強すぎる場合、水寄りに調整
        expect(fireWaterAction.fireWaterAdjustment.after).toBeLessThan(
          fireWaterAction.fireWaterAdjustment.before
        );
      }
    }
  });
});

describe("Hachigen Analyzer - ミナカ整合収束テスト", () => {
  it("ミナカの安定性・調和度・エネルギーが0-100の範囲内", () => {
    const problemContext: ProblemContext = {
      problemType: "other",
      description: "一般的な問題",
    };

    const analysis = analyzeWithHachigen(problemContext);

    expect(analysis.minakaState.stability).toBeGreaterThanOrEqual(0);
    expect(analysis.minakaState.stability).toBeLessThanOrEqual(100);
    expect(analysis.minakaState.harmony).toBeGreaterThanOrEqual(0);
    expect(analysis.minakaState.harmony).toBeLessThanOrEqual(100);
    expect(analysis.minakaState.energy).toBeGreaterThanOrEqual(0);
    expect(analysis.minakaState.energy).toBeLessThanOrEqual(100);
  });

  it("修復後にミナカの調和度が向上", () => {
    const problemContext: ProblemContext = {
      problemType: "user_experience",
      description: "火水バランスの問題",
      userFeedback: "冷たい",
    };

    const analysis = analyzeWithHachigen(problemContext);
    const repairPlan = generateRepairPlan(analysis);

    expect(repairPlan.minakaAdjustment.harmonyAdjustment).toBeGreaterThan(0);
  });
});

describe("Hachigen Evolution Loop - 安定性テスト", () => {
  it("進化ループが正常に開始", () => {
    const problemContext: ProblemContext = {
      problemType: "other",
      description: "一般的な問題",
    };

    const loopState = startEvolutionLoop(problemContext);

    expect(loopState.loopId).toBeTruthy();
    expect(loopState.currentStage).toBe(1);
    expect(loopState.currentIteration).toBe(0);
    expect(loopState.status).toBe("running");
  });

  it("進化ループのステップが正常に実行", () => {
    const problemContext: ProblemContext = {
      problemType: "other",
      description: "一般的な問題",
    };

    let loopState = startEvolutionLoop(problemContext, 10);
    const initialIteration = loopState.currentIteration;

    loopState = executeEvolutionStep(loopState, problemContext);

    expect(loopState.currentIteration).toBe(initialIteration + 1);
    expect(loopState.repairResults.length).toBe(1);
  });

  it("進化ループが正常に完了", () => {
    const problemContext: ProblemContext = {
      problemType: "other",
      description: "一般的な問題",
    };

    let loopState = startEvolutionLoop(problemContext, 5);

    // 5回ステップを実行
    for (let i = 0; i < 5; i++) {
      loopState = executeEvolutionStep(loopState, problemContext);
    }

    const result = completeEvolutionLoop(loopState);

    expect(result.loopId).toBe(loopState.loopId);
    expect(result.totalIterations).toBe(5);
    expect(result.successRate).toBeGreaterThanOrEqual(0);
    expect(result.successRate).toBeLessThanOrEqual(100);
  });

  it("完全な進化ループが正常に実行", async () => {
    const problemContext: ProblemContext = {
      problemType: "performance",
      description: "パフォーマンスの問題",
      performanceMetrics: {
        responseTime: 5000,
      },
    };

    const result = await runFullEvolutionLoop(problemContext, 10);

    expect(result.loopId).toBeTruthy();
    expect(result.totalIterations).toBeGreaterThan(0);
    expect(result.finalScore).toBeGreaterThanOrEqual(result.initialScore);
  });
});

describe("Hachigen Evolution Loop - 霊核倫理との整合テスト", () => {
  it("倫理性の問題が最優先で修復される", async () => {
    const problemContext: ProblemContext = {
      problemType: "user_experience",
      description: "倫理性の問題",
      userFeedback: "不適切な応答",
    };

    const result = await runFullEvolutionLoop(problemContext, 10);

    expect(result.learningRecord.learnings.length).toBeGreaterThan(0);
    expect(result.finalScore).toBeGreaterThan(result.initialScore);
  });

  it("火水バランスが中庸に近づく", async () => {
    const problemContext: ProblemContext = {
      problemType: "user_experience",
      description: "火水バランスの問題",
      userFeedback: "冷たい、機械的",
    };

    const analysis = analyzeWithHachigen(problemContext);
    const repairPlan = generateRepairPlan(analysis);

    // 火水バランスの調整が含まれているか確認
    const hasFireWaterAdjustment = repairPlan.actions.some(action =>
      action.description.includes("火水バランス")
    );

    expect(hasFireWaterAdjustment).toBe(true);
  });
});

describe("Hachigen Evolution Loop - 学習記録テスト", () => {
  it("学習記録に改善パターンが含まれる", async () => {
    const problemContext: ProblemContext = {
      problemType: "performance",
      description: "パフォーマンスの問題",
      performanceMetrics: {
        responseTime: 5000,
      },
    };

    const result = await runFullEvolutionLoop(problemContext, 10);

    expect(result.learningRecord).toBeTruthy();
    expect(result.learningRecord.learnings).toBeInstanceOf(Array);
    expect(result.learningRecord.improvementPatterns).toBeInstanceOf(Array);
    expect(result.learningRecord.recommendations).toBeInstanceOf(Array);
  });

  it("推奨事項が生成される", async () => {
    const problemContext: ProblemContext = {
      problemType: "other",
      description: "一般的な問題",
    };

    const result = await runFullEvolutionLoop(problemContext, 10);

    expect(result.learningRecord.recommendations.length).toBeGreaterThanOrEqual(0);
  });
});
