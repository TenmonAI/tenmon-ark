/**
 * Hachigen Repair Engine（八方位修復器）
 * 
 * 各方位ごとの最適な修復方法を決定し、修復優先度を計算し、
 * 修復案を統合して「中心点（ミナカ）」で最終調整する。
 */

import type {
  HachigenDirection,
  HachigenScore,
  HachigenAnalysisResult,
  ProblemContext,
} from "./hachiGenAnalyzer";

export type RepairPriority = "critical" | "high" | "medium" | "low";

export interface RepairAction {
  /** 修復アクションID */
  actionId: string;
  /** 対象方位 */
  direction: HachigenDirection;
  /** 修復の種類 */
  repairType:
    | "code_fix"
    | "optimization"
    | "refactoring"
    | "configuration"
    | "memory_adjustment"
    | "integration_fix"
    | "timing_adjustment"
    | "relationship_rebuild";
  /** 修復の説明 */
  description: string;
  /** 具体的な修復手順 */
  steps: string[];
  /** 優先度 */
  priority: RepairPriority;
  /** 推定修復時間（分） */
  estimatedTime: number;
  /** 推定効果（スコア改善度） */
  estimatedImpact: number;
  /** 火水調整 */
  fireWaterAdjustment: {
    before: number;
    after: number;
  };
}

export interface RepairPlan {
  /** 修復プランID */
  planId: string;
  /** 作成日時 */
  timestamp: Date;
  /** 元の分析結果 */
  analysis: HachigenAnalysisResult;
  /** 修復アクション */
  actions: RepairAction[];
  /** 修復の順序 */
  executionOrder: string[]; // actionIdの配列
  /** 総推定時間（分） */
  totalEstimatedTime: number;
  /** 総推定効果（スコア改善度） */
  totalEstimatedImpact: number;
  /** ミナカ調整 */
  minakaAdjustment: {
    /** 中心の安定性調整 */
    stabilityAdjustment: number;
    /** 中心の調和度調整 */
    harmonyAdjustment: number;
    /** 中心のエネルギー調整 */
    energyAdjustment: number;
  };
}

export interface RepairResult {
  /** 修復結果ID */
  resultId: string;
  /** 修復日時 */
  timestamp: Date;
  /** 実行されたアクション */
  executedActions: string[]; // actionIdの配列
  /** 修復前のスコア */
  beforeScore: number;
  /** 修復後のスコア */
  afterScore: number;
  /** スコア改善度 */
  improvement: number;
  /** 成功したアクション数 */
  successCount: number;
  /** 失敗したアクション数 */
  failureCount: number;
  /** 修復後の分析結果 */
  afterAnalysis: HachigenAnalysisResult;
}

/**
 * 修復プランを生成
 */
export function generateRepairPlan(analysis: HachigenAnalysisResult): RepairPlan {
  const planId = generatePlanId();
  const timestamp = new Date();

  // 各方位の修復アクションを生成
  const actions: RepairAction[] = [];
  
  Object.entries(analysis.scores).forEach(([direction, score]) => {
    const directionActions = generateRepairActionsForDirection(
      direction as HachigenDirection,
      score
    );
    actions.push(...directionActions);
  });

  // 優先度順にソート
  actions.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    // 優先度が同じ場合は効果の大きい順
    return b.estimatedImpact - a.estimatedImpact;
  });

  // 実行順序を決定（依存関係を考慮）
  const executionOrder = determineExecutionOrder(actions);

  // 総推定時間と効果を計算
  const totalEstimatedTime = actions.reduce((sum, action) => sum + action.estimatedTime, 0);
  const totalEstimatedImpact = actions.reduce((sum, action) => sum + action.estimatedImpact, 0);

  // ミナカ調整を計算
  const minakaAdjustment = calculateMinakaAdjustment(analysis, actions);

  return {
    planId,
    timestamp,
    analysis,
    actions,
    executionOrder,
    totalEstimatedTime,
    totalEstimatedImpact,
    minakaAdjustment,
  };
}

/**
 * プランIDを生成
 */
function generatePlanId(): string {
  return `repair_plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 方位ごとの修復アクションを生成
 */
function generateRepairActionsForDirection(
  direction: HachigenDirection,
  score: HachigenScore
): RepairAction[] {
  const actions: RepairAction[] = [];

  // スコアが低い場合のみ修復アクションを生成
  if (score.score >= 80) {
    return actions;
  }

  switch (direction) {
    case "structure":
      actions.push(...generateStructureRepairActions(score));
      break;
    case "flow":
      actions.push(...generateFlowRepairActions(score));
      break;
    case "reiCore":
      actions.push(...generateReiCoreRepairActions(score));
      break;
    case "context":
      actions.push(...generateContextRepairActions(score));
      break;
    case "intent":
      actions.push(...generateIntentRepairActions(score));
      break;
    case "environment":
      actions.push(...generateEnvironmentRepairActions(score));
      break;
    case "temporal":
      actions.push(...generateTemporalRepairActions(score));
      break;
    case "relation":
      actions.push(...generateRelationRepairActions(score));
      break;
  }

  return actions;
}

/**
 * 構造修復アクションを生成
 */
function generateStructureRepairActions(score: HachigenScore): RepairAction[] {
  const actions: RepairAction[] = [];
  const priority = determinePriority(score.score);

  if (score.issues.some(issue => issue.includes("未定義"))) {
    actions.push({
      actionId: generateActionId(),
      direction: "structure",
      repairType: "code_fix",
      description: "変数の未定義エラーを修正",
      steps: [
        "未定義変数を特定",
        "適切な初期化を追加",
        "型定義を追加",
        "テストを実行して確認",
      ],
      priority,
      estimatedTime: 15,
      estimatedImpact: 20,
      fireWaterAdjustment: {
        before: score.fireWaterBalance,
        after: score.fireWaterBalance + 10,
      },
    });
  }

  if (score.issues.some(issue => issue.includes("型エラー"))) {
    actions.push({
      actionId: generateActionId(),
      direction: "structure",
      repairType: "refactoring",
      description: "TypeScript型定義を修正",
      steps: [
        "型エラーの箇所を特定",
        "正しい型定義を追加",
        "型アサーションを見直し",
        "型チェックを実行",
      ],
      priority,
      estimatedTime: 20,
      estimatedImpact: 15,
      fireWaterAdjustment: {
        before: score.fireWaterBalance,
        after: score.fireWaterBalance + 15,
      },
    });
  }

  if (score.issues.some(issue => issue.includes("依存関係"))) {
    actions.push({
      actionId: generateActionId(),
      direction: "structure",
      repairType: "refactoring",
      description: "依存関係を整理",
      steps: [
        "依存関係グラフを作成",
        "循環依存を特定",
        "モジュール構造を見直し",
        "依存関係を最適化",
      ],
      priority: "medium",
      estimatedTime: 30,
      estimatedImpact: 25,
      fireWaterAdjustment: {
        before: score.fireWaterBalance,
        after: score.fireWaterBalance + 5,
      },
    });
  }

  return actions;
}

/**
 * 流れ修復アクションを生成
 */
function generateFlowRepairActions(score: HachigenScore): RepairAction[] {
  const actions: RepairAction[] = [];
  const priority = determinePriority(score.score);

  if (score.issues.some(issue => issue.includes("応答時間"))) {
    actions.push({
      actionId: generateActionId(),
      direction: "flow",
      repairType: "optimization",
      description: "応答時間を最適化",
      steps: [
        "ボトルネックを特定",
        "非同期処理を最適化",
        "キャッシュを導入",
        "パフォーマンステストを実行",
      ],
      priority,
      estimatedTime: 40,
      estimatedImpact: 30,
      fireWaterAdjustment: {
        before: score.fireWaterBalance,
        after: score.fireWaterBalance - 5, // 流れをスムーズに（水寄り）
      },
    });
  }

  if (score.issues.some(issue => issue.includes("メモリ"))) {
    actions.push({
      actionId: generateActionId(),
      direction: "flow",
      repairType: "memory_adjustment",
      description: "メモリ使用を最適化",
      steps: [
        "メモリリークを検出",
        "不要なデータを削除",
        "メモリプールを最適化",
        "メモリ使用量を監視",
      ],
      priority,
      estimatedTime: 35,
      estimatedImpact: 25,
      fireWaterAdjustment: {
        before: score.fireWaterBalance,
        after: score.fireWaterBalance - 10,
      },
    });
  }

  return actions;
}

/**
 * 霊核修復アクションを生成
 */
function generateReiCoreRepairActions(score: HachigenScore): RepairAction[] {
  const actions: RepairAction[] = [];
  const priority = determinePriority(score.score);

  if (score.issues.some(issue => issue.includes("倫理性"))) {
    actions.push({
      actionId: generateActionId(),
      direction: "reiCore",
      repairType: "configuration",
      description: "倫理性チェックを強化",
      steps: [
        "倫理性チェックルールを見直し",
        "不適切な表現フィルターを追加",
        "応答生成前のチェックを強化",
        "倫理性スコアを監視",
      ],
      priority: "critical",
      estimatedTime: 25,
      estimatedImpact: 40,
      fireWaterAdjustment: {
        before: score.fireWaterBalance,
        after: 0, // 中庸に戻す
      },
    });
  }

  if (score.issues.some(issue => issue.includes("火水バランス"))) {
    const isTooFire = score.issues.some(issue => issue.includes("火が強すぎる"));
    actions.push({
      actionId: generateActionId(),
      direction: "reiCore",
      repairType: "configuration",
      description: "火水バランスを調整",
      steps: [
        "現在の火水バランスを分析",
        isTooFire ? "より柔らかい表現を使用" : "より明確な表現を使用",
        "Natural Presence Engineで調整",
        "バランスを監視",
      ],
      priority,
      estimatedTime: 20,
      estimatedImpact: 30,
      fireWaterAdjustment: {
        before: score.fireWaterBalance,
        after: isTooFire ? score.fireWaterBalance - 30 : score.fireWaterBalance + 30,
      },
    });
  }

  return actions;
}

/**
 * 文脈修復アクションを生成
 */
function generateContextRepairActions(score: HachigenScore): RepairAction[] {
  const actions: RepairAction[] = [];
  const priority = determinePriority(score.score);

  if (score.issues.some(issue => issue.includes("会話履歴"))) {
    actions.push({
      actionId: generateActionId(),
      direction: "context",
      repairType: "memory_adjustment",
      description: "Synaptic Memoryの保存を強化",
      steps: [
        "メモリ保存ロジックを確認",
        "重要な会話を優先保存",
        "メモリの圧縮を最適化",
        "メモリ取得速度を改善",
      ],
      priority,
      estimatedTime: 30,
      estimatedImpact: 25,
      fireWaterAdjustment: {
        before: score.fireWaterBalance,
        after: score.fireWaterBalance - 10, // 深さを増す（水寄り）
      },
    });
  }

  if (score.issues.some(issue => issue.includes("話題の遷移"))) {
    actions.push({
      actionId: generateActionId(),
      direction: "context",
      repairType: "optimization",
      description: "話題の橋渡しを改善",
      steps: [
        "話題遷移検出を強化",
        "橋渡し表現を追加",
        "文脈の連続性を確保",
        "話題遷移の自然さを評価",
      ],
      priority: "medium",
      estimatedTime: 25,
      estimatedImpact: 20,
      fireWaterAdjustment: {
        before: score.fireWaterBalance,
        after: score.fireWaterBalance - 5,
      },
    });
  }

  return actions;
}

/**
 * 意図修復アクションを生成
 */
function generateIntentRepairActions(score: HachigenScore): RepairAction[] {
  const actions: RepairAction[] = [];
  const priority = determinePriority(score.score);

  if (score.issues.some(issue => issue.includes("意図が推定できていません"))) {
    actions.push({
      actionId: generateActionId(),
      direction: "intent",
      repairType: "optimization",
      description: "意図推定モデルを改善",
      steps: [
        "意図推定ロジックを見直し",
        "より多くの文脈情報を収集",
        "意図分類の精度を向上",
        "意図推定結果を検証",
      ],
      priority,
      estimatedTime: 35,
      estimatedImpact: 35,
      fireWaterAdjustment: {
        before: score.fireWaterBalance,
        after: score.fireWaterBalance + 15, // 明確さを増す（火寄り）
      },
    });
  }

  if (score.issues.some(issue => issue.includes("誤認識"))) {
    actions.push({
      actionId: generateActionId(),
      direction: "intent",
      repairType: "configuration",
      description: "意図確認ステップを追加",
      steps: [
        "意図確認の質問を追加",
        "ユーザーフィードバックを収集",
        "意図の再推定を実装",
        "確認プロセスを最適化",
      ],
      priority,
      estimatedTime: 20,
      estimatedImpact: 25,
      fireWaterAdjustment: {
        before: score.fireWaterBalance,
        after: score.fireWaterBalance + 10,
      },
    });
  }

  return actions;
}

/**
 * 外界修復アクションを生成
 */
function generateEnvironmentRepairActions(score: HachigenScore): RepairAction[] {
  const actions: RepairAction[] = [];
  const priority = determinePriority(score.score);

  if (score.issues.some(issue => issue.includes("ネットワーク"))) {
    actions.push({
      actionId: generateActionId(),
      direction: "environment",
      repairType: "integration_fix",
      description: "ネットワークエラーハンドリングを強化",
      steps: [
        "ネットワーク接続を確認",
        "リトライ機構を追加",
        "タイムアウト設定を最適化",
        "エラーメッセージを改善",
      ],
      priority,
      estimatedTime: 25,
      estimatedImpact: 30,
      fireWaterAdjustment: {
        before: score.fireWaterBalance,
        after: score.fireWaterBalance,
      },
    });
  }

  if (score.issues.some(issue => issue.includes("API"))) {
    actions.push({
      actionId: generateActionId(),
      direction: "environment",
      repairType: "integration_fix",
      description: "API呼び出しを最適化",
      steps: [
        "API接続を確認",
        "エラーハンドリングを強化",
        "レスポンスキャッシュを追加",
        "API使用量を監視",
      ],
      priority,
      estimatedTime: 30,
      estimatedImpact: 25,
      fireWaterAdjustment: {
        before: score.fireWaterBalance,
        after: score.fireWaterBalance,
      },
    });
  }

  return actions;
}

/**
 * 時間修復アクションを生成
 */
function generateTemporalRepairActions(score: HachigenScore): RepairAction[] {
  const actions: RepairAction[] = [];
  const priority = determinePriority(score.score);

  if (score.issues.some(issue => issue.includes("タイミング"))) {
    actions.push({
      actionId: generateActionId(),
      direction: "temporal",
      repairType: "timing_adjustment",
      description: "応答タイミングを最適化",
      steps: [
        "応答速度を測定",
        "遅延の原因を特定",
        "リアルタイム性を改善",
        "タイミングを監視",
      ],
      priority,
      estimatedTime: 30,
      estimatedImpact: 25,
      fireWaterAdjustment: {
        before: score.fireWaterBalance,
        after: score.fireWaterBalance - 10, // 流れを改善（水寄り）
      },
    });
  }

  if (score.issues.some(issue => issue.includes("間が悪い"))) {
    actions.push({
      actionId: generateActionId(),
      direction: "temporal",
      repairType: "timing_adjustment",
      description: "会話の間（ま）を調整",
      steps: [
        "Natural Presence Engineで間を分析",
        "呼吸リズムに合わせた間を計算",
        "間の長さを動的に調整",
        "間の自然さを評価",
      ],
      priority: "medium",
      estimatedTime: 20,
      estimatedImpact: 20,
      fireWaterAdjustment: {
        before: score.fireWaterBalance,
        after: score.fireWaterBalance - 15,
      },
    });
  }

  return actions;
}

/**
 * 縁修復アクションを生成
 */
function generateRelationRepairActions(score: HachigenScore): RepairAction[] {
  const actions: RepairAction[] = [];
  const priority = determinePriority(score.score);

  if (score.issues.some(issue => issue.includes("信頼関係"))) {
    actions.push({
      actionId: generateActionId(),
      direction: "relation",
      repairType: "relationship_rebuild",
      description: "ユーザーとの信頼関係を再構築",
      steps: [
        "一貫性のある応答を確保",
        "約束を守る仕組みを追加",
        "透明性を高める",
        "信頼度を監視",
      ],
      priority: "critical",
      estimatedTime: 40,
      estimatedImpact: 40,
      fireWaterAdjustment: {
        before: score.fireWaterBalance,
        after: score.fireWaterBalance - 20, // 受容性を高める（水寄り）
      },
    });
  }

  if (score.issues.some(issue => issue.includes("距離感"))) {
    actions.push({
      actionId: generateActionId(),
      direction: "relation",
      repairType: "configuration",
      description: "寄り添いモードの距離設定を調整",
      steps: [
        "現在の距離感を分析",
        "適切な距離を計算",
        "寄り添いモードのパラメータを調整",
        "距離感を監視",
      ],
      priority,
      estimatedTime: 15,
      estimatedImpact: 25,
      fireWaterAdjustment: {
        before: score.fireWaterBalance,
        after: score.fireWaterBalance - 10,
      },
    });
  }

  if (score.issues.some(issue => issue.includes("学習の継続性"))) {
    actions.push({
      actionId: generateActionId(),
      direction: "relation",
      repairType: "memory_adjustment",
      description: "学習の継続性を強化",
      steps: [
        "Synaptic Memoryの保存を確認",
        "重要な学習内容を優先保存",
        "学習の想起を改善",
        "継続性を監視",
      ],
      priority,
      estimatedTime: 25,
      estimatedImpact: 30,
      fireWaterAdjustment: {
        before: score.fireWaterBalance,
        after: score.fireWaterBalance - 15,
      },
    });
  }

  return actions;
}

/**
 * アクションIDを生成
 */
function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 優先度を決定
 */
function determinePriority(score: number): RepairPriority {
  if (score < 40) return "critical";
  if (score < 60) return "high";
  if (score < 75) return "medium";
  return "low";
}

/**
 * 実行順序を決定
 */
function determineExecutionOrder(actions: RepairAction[]): string[] {
  // 依存関係を考慮した実行順序
  // 1. critical優先
  // 2. 構造 → 流れ → 文脈 → 意図 → 外界 → 時間 → 霊核 → 縁
  
  const directionOrder: HachigenDirection[] = [
    "structure",
    "flow",
    "context",
    "intent",
    "environment",
    "temporal",
    "reiCore",
    "relation",
  ];

  const sorted = [...actions].sort((a, b) => {
    // 優先度順
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // 方位順
    const directionDiff = directionOrder.indexOf(a.direction) - directionOrder.indexOf(b.direction);
    if (directionDiff !== 0) return directionDiff;

    // 効果順
    return b.estimatedImpact - a.estimatedImpact;
  });

  return sorted.map(action => action.actionId);
}

/**
 * ミナカ調整を計算
 */
function calculateMinakaAdjustment(
  analysis: HachigenAnalysisResult,
  actions: RepairAction[]
): {
  stabilityAdjustment: number;
  harmonyAdjustment: number;
  energyAdjustment: number;
} {
  // 修復アクションが0件の場合の処理
  if (actions.length === 0) {
    return {
      stabilityAdjustment: 0,
      harmonyAdjustment: 0,
      energyAdjustment: 0,
    };
  }
  
  // 修復アクションによる中心点への影響を計算
  
  // 安定性：修復アクション数が多いほど安定性が増す
  const stabilityAdjustment = Math.min(30, actions.length * 3);

  // 調和度：火水バランスの調整が行われるほど調和度が増す
  const fireWaterAdjustments = actions.map(a => 
    Math.abs(a.fireWaterAdjustment.after - a.fireWaterAdjustment.before)
  );
  const avgAdjustment = fireWaterAdjustments.reduce((sum, v) => sum + v, 0) / fireWaterAdjustments.length;
  const harmonyAdjustment = Math.min(30, avgAdjustment / 2); // 調整量の半分を調和度とする

  // エネルギー：総推定効果から計算
  const totalImpact = actions.reduce((sum, a) => sum + a.estimatedImpact, 0);
  const energyAdjustment = Math.min(40, totalImpact / 2);

  return {
    stabilityAdjustment: Math.round(stabilityAdjustment),
    harmonyAdjustment: Math.round(harmonyAdjustment),
    energyAdjustment: Math.round(energyAdjustment),
  };
}
