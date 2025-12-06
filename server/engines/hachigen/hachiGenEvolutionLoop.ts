/**
 * Hachigen Evolution Loop
 * 
 * Self Evolution Layerと連結し、8方向 × 8段階の修復ループを実行。
 * 完了後、Soul Syncに改善学習を記録する。
 */

import type { HachigenAnalysisResult, ProblemContext } from "./hachiGenAnalyzer";
import type { RepairPlan, RepairAction, RepairResult } from "./hachiGenRepairEngine";
import { analyzeWithHachigen } from "./hachiGenAnalyzer";
import { generateRepairPlan } from "./hachiGenRepairEngine";

export interface EvolutionStage {
  /** ステージ番号（1-8） */
  stage: number;
  /** ステージ名 */
  name: string;
  /** ステージの説明 */
  description: string;
  /** 完了条件（スコア閾値） */
  completionThreshold: number;
}

export interface EvolutionLoopState {
  /** ループID */
  loopId: string;
  /** 開始日時 */
  startTime: Date;
  /** 現在のステージ */
  currentStage: number;
  /** 現在のイテレーション */
  currentIteration: number;
  /** 最大イテレーション数 */
  maxIterations: number;
  /** 初期分析結果 */
  initialAnalysis: HachigenAnalysisResult;
  /** 現在の分析結果 */
  currentAnalysis: HachigenAnalysisResult;
  /** 実行された修復プラン */
  executedPlans: RepairPlan[];
  /** 修復結果 */
  repairResults: RepairResult[];
  /** ループの状態 */
  status: "running" | "completed" | "failed" | "paused";
  /** 進捗率（0-100） */
  progress: number;
}

export interface EvolutionLoopResult {
  /** ループID */
  loopId: string;
  /** 完了日時 */
  completionTime: Date;
  /** 初期スコア */
  initialScore: number;
  /** 最終スコア */
  finalScore: number;
  /** スコア改善度 */
  totalImprovement: number;
  /** 実行されたステージ数 */
  completedStages: number;
  /** 実行されたイテレーション数 */
  totalIterations: number;
  /** 実行された修復アクション数 */
  totalActions: number;
  /** 成功率（%） */
  successRate: number;
  /** Soul Syncへの学習記録 */
  learningRecord: {
    /** 学習内容 */
    learnings: string[];
    /** 改善パターン */
    improvementPatterns: string[];
    /** 今後の推奨事項 */
    recommendations: string[];
  };
}

/**
 * 8段階の進化ステージ
 */
const EVOLUTION_STAGES: EvolutionStage[] = [
  {
    stage: 1,
    name: "初期診断",
    description: "問題を8方位に分析し、全体像を把握する",
    completionThreshold: 50,
  },
  {
    stage: 2,
    name: "緊急修復",
    description: "Critical優先度の問題を修復する",
    completionThreshold: 60,
  },
  {
    stage: 3,
    name: "構造強化",
    description: "構造・流れ・外界の問題を修復する",
    completionThreshold: 70,
  },
  {
    stage: 4,
    name: "文脈整備",
    description: "文脈・意図の問題を修復する",
    completionThreshold: 75,
  },
  {
    stage: 5,
    name: "霊核調整",
    description: "霊核・火水バランスを調整する",
    completionThreshold: 80,
  },
  {
    stage: 6,
    name: "時間最適化",
    description: "時間・タイミングを最適化する",
    completionThreshold: 85,
  },
  {
    stage: 7,
    name: "関係性再構築",
    description: "ユーザーとの関係性を再構築する",
    completionThreshold: 90,
  },
  {
    stage: 8,
    name: "ミナカ統合",
    description: "中心点で全方位を統合し、調和を達成する",
    completionThreshold: 95,
  },
];

/**
 * 進化ループを開始
 */
export function startEvolutionLoop(
  problemContext: ProblemContext,
  maxIterations: number = 64 // 8方向 × 8段階
): EvolutionLoopState {
  const loopId = generateLoopId();
  const startTime = new Date();
  
  // 初期分析
  const initialAnalysis = analyzeWithHachigen(problemContext);

  return {
    loopId,
    startTime,
    currentStage: 1,
    currentIteration: 0,
    maxIterations,
    initialAnalysis,
    currentAnalysis: initialAnalysis,
    executedPlans: [],
    repairResults: [],
    status: "running",
    progress: 0,
  };
}

/**
 * ループIDを生成
 */
function generateLoopId(): string {
  return `evolution_loop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 進化ループの次のステップを実行
 */
export function executeEvolutionStep(
  loopState: EvolutionLoopState,
  problemContext: ProblemContext
): EvolutionLoopState {
  if (loopState.status !== "running") {
    return loopState;
  }

  // 現在のステージを取得
  const currentStage = EVOLUTION_STAGES[loopState.currentStage - 1];
  
  // 修復プランを生成
  const repairPlan = generateRepairPlan(loopState.currentAnalysis);
  
  // 現在のステージに適した修復アクションをフィルタリング
  const stageActions = filterActionsForStage(repairPlan.actions, loopState.currentStage);
  
  // 修復アクションを実行（シミュレーション）
  const repairResult = simulateRepairExecution(
    loopState.currentAnalysis,
    stageActions,
    problemContext
  );

  // 状態を更新
  const newIteration = loopState.currentIteration + 1;
  const newExecutedPlans = [...loopState.executedPlans, repairPlan];
  const newRepairResults = [...loopState.repairResults, repairResult];
  
  // 進捗率を計算
  const progress = Math.round((newIteration / loopState.maxIterations) * 100);

  // 次のステージに進むかチェック
  let newStage = loopState.currentStage;
  let newStatus: "running" | "completed" | "failed" | "paused" = loopState.status;
  
  if (repairResult.afterScore >= currentStage.completionThreshold) {
    // ステージクリア
    if (loopState.currentStage < EVOLUTION_STAGES.length) {
      newStage = loopState.currentStage + 1;
    } else {
      // 全ステージ完了
      newStatus = "completed";
    }
  }

  // 最大イテレーション到達チェック
  if (newIteration >= loopState.maxIterations) {
    newStatus = "completed";
  }

  return {
    ...loopState,
    currentStage: newStage,
    currentIteration: newIteration,
    currentAnalysis: repairResult.afterAnalysis,
    executedPlans: newExecutedPlans,
    repairResults: newRepairResults,
    status: newStatus,
    progress,
  };
}

/**
 * ステージに適した修復アクションをフィルタリング
 */
function filterActionsForStage(
  actions: RepairAction[],
  stage: number
): RepairAction[] {
  switch (stage) {
    case 1: // 初期診断
      return actions.filter(a => a.priority === "critical");
    case 2: // 緊急修復
      return actions.filter(a => a.priority === "critical" || a.priority === "high");
    case 3: // 構造強化
      return actions.filter(a =>
        a.direction === "structure" || a.direction === "flow" || a.direction === "environment"
      );
    case 4: // 文脈整備
      return actions.filter(a => a.direction === "context" || a.direction === "intent");
    case 5: // 霊核調整
      return actions.filter(a => a.direction === "reiCore");
    case 6: // 時間最適化
      return actions.filter(a => a.direction === "temporal");
    case 7: // 関係性再構築
      return actions.filter(a => a.direction === "relation");
    case 8: // ミナカ統合
      return actions; // 全方位
    default:
      return actions;
  }
}

/**
 * 修復実行をシミュレート
 */
function simulateRepairExecution(
  currentAnalysis: HachigenAnalysisResult,
  actions: RepairAction[],
  problemContext: ProblemContext
): RepairResult {
  const resultId = generateResultId();
  const timestamp = new Date();
  const beforeScore = currentAnalysis.overallScore;

  // 修復後のスコアを計算（シミュレーション）
  let afterScore = beforeScore;
  let successCount = 0;
  let failureCount = 0;

  actions.forEach(action => {
    // 成功率を計算（優先度が高いほど成功率が高い）
    const successProbability = {
      critical: 0.95,
      high: 0.90,
      medium: 0.85,
      low: 0.80,
    }[action.priority];

    const isSuccess = Math.random() < successProbability;
    
    if (isSuccess) {
      afterScore += action.estimatedImpact * 0.8; // 推定効果の80%を実現
      successCount++;
    } else {
      failureCount++;
    }
  });

  // スコアの上限を100に制限
  afterScore = Math.min(100, afterScore);

  // 修復後の分析を実行
  const afterAnalysis = analyzeWithHachigen(problemContext);
  
  // スコアを更新（シミュレーション結果を反映）
  afterAnalysis.overallScore = Math.round(afterScore);

  return {
    resultId,
    timestamp,
    executedActions: actions.map(a => a.actionId),
    beforeScore,
    afterScore: Math.round(afterScore),
    improvement: Math.round(afterScore - beforeScore),
    successCount,
    failureCount,
    afterAnalysis,
  };
}

/**
 * 結果IDを生成
 */
function generateResultId(): string {
  return `repair_result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 進化ループを完了
 */
export function completeEvolutionLoop(loopState: EvolutionLoopState): EvolutionLoopResult {
  const completionTime = new Date();
  const initialScore = loopState.initialAnalysis.overallScore;
  const finalScore = loopState.currentAnalysis.overallScore;
  const totalImprovement = finalScore - initialScore;
  
  // 完了したステージ数を計算
  const completedStages = loopState.currentStage - 1;
  
  // 総アクション数を計算
  const totalActions = loopState.repairResults.reduce(
    (sum, result) => sum + result.executedActions.length,
    0
  );
  
  // 成功率を計算
  const totalSuccess = loopState.repairResults.reduce((sum, result) => sum + result.successCount, 0);
  const totalFailure = loopState.repairResults.reduce((sum, result) => sum + result.failureCount, 0);
  const successRate = totalSuccess + totalFailure > 0
    ? Math.round((totalSuccess / (totalSuccess + totalFailure)) * 100)
    : 0;

  // Soul Syncへの学習記録を生成
  const learningRecord = generateLearningRecord(loopState);

  return {
    loopId: loopState.loopId,
    completionTime,
    initialScore,
    finalScore,
    totalImprovement,
    completedStages,
    totalIterations: loopState.currentIteration,
    totalActions,
    successRate,
    learningRecord,
  };
}

/**
 * 学習記録を生成
 */
function generateLearningRecord(loopState: EvolutionLoopState): {
  learnings: string[];
  improvementPatterns: string[];
  recommendations: string[];
} {
  const learnings: string[] = [];
  const improvementPatterns: string[] = [];
  const recommendations: string[] = [];

  // 学習内容を抽出
  const criticalDirections = loopState.initialAnalysis.criticalDirections;
  if (criticalDirections.length > 0) {
    learnings.push(`最も問題があった方位: ${criticalDirections.join(", ")}`);
  }

  const healthyDirections = loopState.currentAnalysis.healthyDirections;
  if (healthyDirections.length > 0) {
    learnings.push(`最終的に健全になった方位: ${healthyDirections.join(", ")}`);
  }

  // 改善パターンを抽出
  const improvements = loopState.repairResults.map(r => r.improvement);
  const avgImprovement = improvements.reduce((sum, v) => sum + v, 0) / improvements.length;
  
  if (avgImprovement > 5) {
    improvementPatterns.push("段階的な修復が効果的だった");
  }
  
  if (loopState.currentAnalysis.minakaState.harmony > loopState.initialAnalysis.minakaState.harmony + 20) {
    improvementPatterns.push("火水バランスの調整が調和度を大幅に改善した");
  }

  // 推奨事項を生成
  if (loopState.currentAnalysis.overallScore < 90) {
    recommendations.push("さらなる改善のため、定期的な自己診断を継続してください");
  }

  if (loopState.currentAnalysis.minakaState.stability < 80) {
    recommendations.push("中心点の安定性を高めるため、全方位のバランスを保ってください");
  }

  const lowScoreDirections = Object.entries(loopState.currentAnalysis.scores)
    .filter(([_, score]) => score.score < 70)
    .map(([direction]) => direction);
  
  if (lowScoreDirections.length > 0) {
    recommendations.push(`以下の方位に重点的に取り組んでください: ${lowScoreDirections.join(", ")}`);
  }

  return {
    learnings,
    improvementPatterns,
    recommendations,
  };
}

/**
 * 進化ループを自動実行
 */
export async function runFullEvolutionLoop(
  problemContext: ProblemContext,
  maxIterations: number = 64
): Promise<EvolutionLoopResult> {
  let loopState = startEvolutionLoop(problemContext, maxIterations);

  while (loopState.status === "running") {
    loopState = executeEvolutionStep(loopState, problemContext);
    
    // 実際の環境では、ここで少し待機する
    // await new Promise(resolve => setTimeout(resolve, 100));
  }

  return completeEvolutionLoop(loopState);
}
