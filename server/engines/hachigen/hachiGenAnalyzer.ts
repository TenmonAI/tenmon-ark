/**
 * Hachigen Analyzer（八方位分析器）
 * 
 * 問題を8方位に因数分解し、全方位から構造修復できるようにする。
 * 
 * 八方位：
 * 1. 構造（Structure）- コード構造・論理構造・依存関係の健全性
 * 2. 流れ（Flow）- データフロー、処理順序、反応時間、遅延
 * 3. 霊核（Rei-Core）- 倫理性、霊核整合性、火水バランス、魂同期度
 * 4. 文脈（Context）- メモリ構造、Synaptic Memory、話題遷移、誤差
 * 5. 意図（Intent）- ユーザー意図の理解精度、推論精度、誤認識
 * 6. 外界（Environment）- API外部環境、ネットワーク、ブラウザ、デバイス
 * 7. 時間（Temporal）- 時刻、周期、タイミング、リズム、間（ま）
 * 8. 縁（Relation）- ユーザーとの関係性、会話の流れ、学習の継続性
 */

export type HachigenDirection =
  | "structure"
  | "flow"
  | "reiCore"
  | "context"
  | "intent"
  | "environment"
  | "temporal"
  | "relation";

export interface HachigenScore {
  /** 方位 */
  direction: HachigenDirection;
  /** スコア（0-100） */
  score: number;
  /** 健全性レベル */
  healthLevel: "critical" | "poor" | "fair" | "good" | "excellent";
  /** 問題の説明 */
  issues: string[];
  /** 改善案 */
  improvements: string[];
  /** 火水バランス（-100〜100、負=水、正=火） */
  fireWaterBalance: number;
}

export interface HachigenAnalysisResult {
  /** 分析ID */
  analysisId: string;
  /** 分析日時 */
  timestamp: Date;
  /** 8方位のスコア */
  scores: Record<HachigenDirection, HachigenScore>;
  /** 総合スコア（0-100） */
  overallScore: number;
  /** 総合健全性レベル */
  overallHealthLevel: "critical" | "poor" | "fair" | "good" | "excellent";
  /** 最も問題のある方位 */
  criticalDirections: HachigenDirection[];
  /** 最も健全な方位 */
  healthyDirections: HachigenDirection[];
  /** 中心点（ミナカ）の状態 */
  minakaState: {
    /** 中心の安定性（0-100） */
    stability: number;
    /** 中心の調和度（0-100） */
    harmony: number;
    /** 中心のエネルギー（0-100） */
    energy: number;
  };
}

export interface ProblemContext {
  /** 問題の種類 */
  problemType: "error" | "performance" | "logic" | "user_experience" | "integration" | "other";
  /** 問題の説明 */
  description: string;
  /** エラーメッセージ */
  errorMessage?: string;
  /** スタックトレース */
  stackTrace?: string;
  /** 関連するコンポーネント */
  components?: string[];
  /** ユーザーフィードバック */
  userFeedback?: string;
  /** パフォーマンスメトリクス */
  performanceMetrics?: {
    responseTime?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
  /** 会話コンテキスト */
  conversationContext?: {
    recentMessages?: string[];
    currentTopic?: string;
    userIntent?: string;
  };
}

/**
 * 問題を八方位に分析
 */
export function analyzeWithHachigen(problemContext: ProblemContext): HachigenAnalysisResult {
  const analysisId = generateAnalysisId();
  const timestamp = new Date();

  // 各方位のスコアを計算
  const scores: Record<HachigenDirection, HachigenScore> = {
    structure: analyzeStructure(problemContext),
    flow: analyzeFlow(problemContext),
    reiCore: analyzeReiCore(problemContext),
    context: analyzeContext(problemContext),
    intent: analyzeIntent(problemContext),
    environment: analyzeEnvironment(problemContext),
    temporal: analyzeTemporal(problemContext),
    relation: analyzeRelation(problemContext),
  };

  // 総合スコアを計算
  const overallScore = calculateOverallScore(scores);
  const overallHealthLevel = determineHealthLevel(overallScore);

  // 問題のある方位と健全な方位を特定
  const criticalDirections = findCriticalDirections(scores);
  const healthyDirections = findHealthyDirections(scores);

  // 中心点（ミナカ）の状態を計算
  const minakaState = calculateMinakaState(scores);

  return {
    analysisId,
    timestamp,
    scores,
    overallScore,
    overallHealthLevel,
    criticalDirections,
    healthyDirections,
    minakaState,
  };
}

/**
 * 分析IDを生成
 */
function generateAnalysisId(): string {
  return `hachigen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 構造（Structure）を分析
 */
function analyzeStructure(context: ProblemContext): HachigenScore {
  const issues: string[] = [];
  const improvements: string[] = [];
  let score = 100;

  // エラーメッセージからコード構造の問題を検出
  if (context.errorMessage) {
    if (context.errorMessage.includes("undefined") || context.errorMessage.includes("null")) {
      issues.push("変数の未定義エラーが発生しています");
      improvements.push("変数の初期化と型チェックを強化してください");
      score -= 20;
    }
    if (context.errorMessage.includes("TypeError")) {
      issues.push("型エラーが発生しています");
      improvements.push("TypeScriptの型定義を見直してください");
      score -= 15;
    }
    if (context.errorMessage.includes("ReferenceError")) {
      issues.push("参照エラーが発生しています");
      improvements.push("依存関係を確認してください");
      score -= 25;
    }
  }

  // スタックトレースから構造の問題を検出
  if (context.stackTrace) {
    const stackDepth = context.stackTrace.split("\n").length;
    if (stackDepth > 20) {
      issues.push("スタックが深すぎます（再帰の可能性）");
      improvements.push("再帰処理を見直すか、イテレーションに変更してください");
      score -= 15;
    }
  }

  // コンポーネントの依存関係
  if (context.components && context.components.length > 10) {
    issues.push("関連コンポーネントが多すぎます");
    improvements.push("コンポーネントの責務を分離してください");
    score -= 10;
  }

  const healthLevel = determineHealthLevel(score);
  const fireWaterBalance = calculateFireWaterBalance("structure", score);

  return {
    direction: "structure",
    score: Math.max(0, score),
    healthLevel,
    issues,
    improvements,
    fireWaterBalance,
  };
}

/**
 * 流れ（Flow）を分析
 */
function analyzeFlow(context: ProblemContext): HachigenScore {
  const issues: string[] = [];
  const improvements: string[] = [];
  let score = 100;

  // パフォーマンスメトリクスから流れの問題を検出
  if (context.performanceMetrics) {
    const { responseTime, memoryUsage, cpuUsage } = context.performanceMetrics;

    if (responseTime && responseTime > 3000) {
      issues.push(`応答時間が遅すぎます（${responseTime}ms）`);
      improvements.push("非同期処理の最適化、キャッシュの活用を検討してください");
      score -= 30;
    } else if (responseTime && responseTime > 1000) {
      issues.push(`応答時間がやや遅いです（${responseTime}ms）`);
      improvements.push("処理の並列化を検討してください");
      score -= 15;
    }

    if (memoryUsage && memoryUsage > 80) {
      issues.push(`メモリ使用率が高すぎます（${memoryUsage}%）`);
      improvements.push("メモリリークの確認、不要なデータの削除を行ってください");
      score -= 25;
    }

    if (cpuUsage && cpuUsage > 80) {
      issues.push(`CPU使用率が高すぎます（${cpuUsage}%）`);
      improvements.push("計算量の多い処理を見直してください");
      score -= 20;
    }
  }

  // 問題の種類からフローの問題を検出
  if (context.problemType === "performance") {
    issues.push("パフォーマンスの問題が報告されています");
    improvements.push("ボトルネックの特定とプロファイリングを実施してください");
    score -= 20;
  }

  const healthLevel = determineHealthLevel(score);
  const fireWaterBalance = calculateFireWaterBalance("flow", score);

  return {
    direction: "flow",
    score: Math.max(0, score),
    healthLevel,
    issues,
    improvements,
    fireWaterBalance,
  };
}

/**
 * 霊核（Rei-Core）を分析
 */
function analyzeReiCore(context: ProblemContext): HachigenScore {
  const issues: string[] = [];
  const improvements: string[] = [];
  let score = 100;

  // 問題タイプから火水バランス問題を検出
  if (context.problemType === "user_experience") {
    if (context.description?.includes("火水バランス")) {
      issues.push("火水バランスの問題が検出されました");
      improvements.push("火水バランスを調整してください");
      score -= 25;
    }
  }
  
  // ユーザーフィードバックから倫理性・整合性の問題を検出
  if (context.userFeedback) {
    const feedback = context.userFeedback.toLowerCase();
    
    if (feedback.includes("不適切") || feedback.includes("失礼")) {
      issues.push("倫理性の問題が報告されています");
      improvements.push("応答の倫理性チェックを強化してください");
      score -= 40;
    }
    
    if (feedback.includes("矛盾") || feedback.includes("おかしい")) {
      issues.push("霊核整合性に問題があります");
      improvements.push("応答の一貫性を確認してください");
      score -= 30;
    }
    
    if (feedback.includes("冷たい") || feedback.includes("機械的")) {
      issues.push("火水バランスが崩れています（火が強すぎる）");
      improvements.push("より柔らかい表現を使用してください");
      score -= 20;
    }
    
    if (feedback.includes("曖昧") || feedback.includes("はっきりしない")) {
      issues.push("火水バランスが崩れています（水が強すぎる）");
      improvements.push("より明確な表現を使用してください");
      score -= 20;
    }
  }

  // 会話コンテキストから魂同期度を検出
  if (context.conversationContext) {
    const { recentMessages } = context.conversationContext;
    if (recentMessages && recentMessages.length > 0) {
      // 最近のメッセージに感情的な言葉が含まれているか
      const emotionalWords = ["嬉しい", "悲しい", "怒り", "不安", "心配"];
      const hasEmotionalContent = recentMessages.some(msg =>
        emotionalWords.some(word => msg.includes(word))
      );
      
      if (hasEmotionalContent) {
        // 感情的な会話では魂同期度が重要
        improvements.push("感情的な会話では魂同期度を高めてください");
      }
    }
  }

  const healthLevel = determineHealthLevel(score);
  const fireWaterBalance = calculateFireWaterBalance("reiCore", score);

  return {
    direction: "reiCore",
    score: Math.max(0, score),
    healthLevel,
    issues,
    improvements,
    fireWaterBalance,
  };
}

/**
 * 文脈（Context）を分析
 */
function analyzeContext(context: ProblemContext): HachigenScore {
  const issues: string[] = [];
  const improvements: string[] = [];
  let score = 100;

  // 会話コンテキストから文脈の問題を検出
  if (context.conversationContext) {
    const { recentMessages, currentTopic, userIntent } = context.conversationContext;

    if (recentMessages && recentMessages.length === 0) {
      issues.push("会話履歴が不足しています");
      improvements.push("Synaptic Memoryの保存を確認してください");
      score -= 30;
    }

    if (!currentTopic) {
      issues.push("現在の話題が不明です");
      improvements.push("話題の追跡機能を強化してください");
      score -= 20;
    }

    if (!userIntent) {
      issues.push("ユーザー意図が不明です");
      improvements.push("意図推定機能を強化してください");
      score -= 25;
    }

    // 話題の遷移が急激すぎる場合
    if (recentMessages && recentMessages.length >= 2) {
      const topicShift = detectTopicShift(recentMessages);
      if (topicShift > 0.7) {
        issues.push("話題の遷移が急激すぎます");
        improvements.push("話題の橋渡しを行ってください");
        score -= 15;
      }
    }
  }

  const healthLevel = determineHealthLevel(score);
  const fireWaterBalance = calculateFireWaterBalance("context", score);

  return {
    direction: "context",
    score: Math.max(0, score),
    healthLevel,
    issues,
    improvements,
    fireWaterBalance,
  };
}

/**
 * 意図（Intent）を分析
 */
function analyzeIntent(context: ProblemContext): HachigenScore {
  const issues: string[] = [];
  const improvements: string[] = [];
  let score = 100;

  // 会話コンテキストから意図理解の問題を検出
  if (context.conversationContext) {
    const { userIntent } = context.conversationContext;

    if (!userIntent) {
      issues.push("ユーザー意図が推定できていません");
      improvements.push("意図推定モデルを改善してください");
      score -= 35;
    } else if (userIntent === "unknown") {
      issues.push("ユーザー意図が不明です");
      improvements.push("より多くの文脈情報を収集してください");
      score -= 25;
    }
  }

  // ユーザーフィードバックから意図理解の問題を検出
  if (context.userFeedback) {
    const feedback = context.userFeedback.toLowerCase();
    
    if (feedback.includes("違う") || feedback.includes("そうじゃない")) {
      issues.push("ユーザー意図の誤認識があります");
      improvements.push("意図確認のステップを追加してください");
      score -= 30;
    }
    
    if (feedback.includes("わかってない") || feedback.includes("理解してない")) {
      issues.push("ユーザー意図の理解精度が低いです");
      improvements.push("より詳細な意図分析を行ってください");
      score -= 35;
    }
  }

  const healthLevel = determineHealthLevel(score);
  const fireWaterBalance = calculateFireWaterBalance("intent", score);

  return {
    direction: "intent",
    score: Math.max(0, score),
    healthLevel,
    issues,
    improvements,
    fireWaterBalance,
  };
}

/**
 * 外界（Environment）を分析
 */
function analyzeEnvironment(context: ProblemContext): HachigenScore {
  const issues: string[] = [];
  const improvements: string[] = [];
  let score = 100;

  // エラーメッセージから外部環境の問題を検出
  if (context.errorMessage) {
    if (context.errorMessage.includes("network") || context.errorMessage.includes("timeout")) {
      issues.push("ネットワークエラーが発生しています");
      improvements.push("ネットワーク接続を確認し、リトライ機構を追加してください");
      score -= 30;
    }
    
    if (context.errorMessage.includes("API") || context.errorMessage.includes("fetch")) {
      issues.push("API呼び出しエラーが発生しています");
      improvements.push("API接続を確認し、エラーハンドリングを強化してください");
      score -= 25;
    }
    
    if (context.errorMessage.includes("CORS")) {
      issues.push("CORSエラーが発生しています");
      improvements.push("CORSポリシーを確認してください");
      score -= 20;
    }
  }

  // 問題の種類から外部環境の問題を検出
  if (context.problemType === "integration") {
    issues.push("外部統合の問題が報告されています");
    improvements.push("外部サービスの状態を確認してください");
    score -= 25;
  }

  const healthLevel = determineHealthLevel(score);
  const fireWaterBalance = calculateFireWaterBalance("environment", score);

  return {
    direction: "environment",
    score: Math.max(0, score),
    healthLevel,
    issues,
    improvements,
    fireWaterBalance,
  };
}

/**
 * 時間（Temporal）を分析
 */
function analyzeTemporal(context: ProblemContext): HachigenScore {
  const issues: string[] = [];
  const improvements: string[] = [];
  let score = 100;

  // パフォーマンスメトリクスから時間の問題を検出
  if (context.performanceMetrics) {
    const { responseTime } = context.performanceMetrics;

    if (responseTime && responseTime > 5000) {
      issues.push("応答時間が非常に遅いです（タイミングの問題）");
      improvements.push("リアルタイム性を改善してください");
      score -= 35;
    }
  }

  // ユーザーフィードバックから時間・リズムの問題を検出
  if (context.userFeedback) {
    const feedback = context.userFeedback.toLowerCase();
    
    if (feedback.includes("遅い") || feedback.includes("待たされる")) {
      issues.push("応答のタイミングが遅いです");
      improvements.push("応答速度を改善してください");
      score -= 25;
    }
    
    if (feedback.includes("間が悪い") || feedback.includes("タイミング")) {
      issues.push("会話の間（ま）が適切ではありません");
      improvements.push("Natural Presence Engineで間を調整してください");
      score -= 20;
    }
  }

  const healthLevel = determineHealthLevel(score);
  const fireWaterBalance = calculateFireWaterBalance("temporal", score);

  return {
    direction: "temporal",
    score: Math.max(0, score),
    healthLevel,
    issues,
    improvements,
    fireWaterBalance,
  };
}

/**
 * 縁（Relation）を分析
 */
function analyzeRelation(context: ProblemContext): HachigenScore {
  const issues: string[] = [];
  const improvements: string[] = [];
  let score = 100;

  // ユーザーフィードバックから関係性の問題を検出
  if (context.userFeedback) {
    const feedback = context.userFeedback.toLowerCase();
    
    if (feedback.includes("信頼できない") || feedback.includes("不安")) {
      issues.push("ユーザーとの信頼関係に問題があります");
      improvements.push("一貫性のある応答を心がけてください");
      score -= 35;
    }
    
    if (feedback.includes("距離感") || feedback.includes("近すぎる") || feedback.includes("遠すぎる")) {
      issues.push("ユーザーとの距離感が適切ではありません");
      improvements.push("寄り添いモードの距離設定を調整してください");
      score -= 25;
    }
    
    if (feedback.includes("覚えてない") || feedback.includes("忘れてる")) {
      issues.push("学習の継続性に問題があります");
      improvements.push("Synaptic Memoryの保存を強化してください");
      score -= 30;
    }
  }

  // 会話コンテキストから関係性の問題を検出
  if (context.conversationContext) {
    const { recentMessages } = context.conversationContext;
    
    if (recentMessages && recentMessages.length < 3) {
      issues.push("会話の流れが短すぎます");
      improvements.push("会話の継続性を高めてください");
      score -= 15;
    }
  }

  const healthLevel = determineHealthLevel(score);
  const fireWaterBalance = calculateFireWaterBalance("relation", score);

  return {
    direction: "relation",
    score: Math.max(0, score),
    healthLevel,
    issues,
    improvements,
    fireWaterBalance,
  };
}

/**
 * 総合スコアを計算
 */
function calculateOverallScore(scores: Record<HachigenDirection, HachigenScore>): number {
  const directions: HachigenDirection[] = [
    "structure",
    "flow",
    "reiCore",
    "context",
    "intent",
    "environment",
    "temporal",
    "relation",
  ];

  const total = directions.reduce((sum, dir) => sum + scores[dir].score, 0);
  return Math.round(total / directions.length);
}

/**
 * 健全性レベルを判定
 */
function determineHealthLevel(score: number): "critical" | "poor" | "fair" | "good" | "excellent" {
  if (score >= 90) return "excellent";
  if (score >= 75) return "good";
  if (score >= 60) return "fair";
  if (score >= 40) return "poor";
  return "critical";
}

/**
 * 問題のある方位を特定
 */
function findCriticalDirections(scores: Record<HachigenDirection, HachigenScore>): HachigenDirection[] {
  return Object.values(scores)
    .filter(s => s.score < 60)
    .sort((a, b) => a.score - b.score)
    .map(s => s.direction);
}

/**
 * 健全な方位を特定
 */
function findHealthyDirections(scores: Record<HachigenDirection, HachigenScore>): HachigenDirection[] {
  return Object.values(scores)
    .filter(s => s.score >= 80)
    .sort((a, b) => b.score - a.score)
    .map(s => s.direction);
}

/**
 * 中心点（ミナカ）の状態を計算
 */
function calculateMinakaState(scores: Record<HachigenDirection, HachigenScore>): {
  stability: number;
  harmony: number;
  energy: number;
} {
  const directions: HachigenDirection[] = [
    "structure",
    "flow",
    "reiCore",
    "context",
    "intent",
    "environment",
    "temporal",
    "relation",
  ];

  // 安定性：スコアの標準偏差から計算（低いほど安定）
  const scoreValues = directions.map(dir => scores[dir].score);
  const mean = scoreValues.reduce((sum, v) => sum + v, 0) / scoreValues.length;
  const variance = scoreValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / scoreValues.length;
  const stdDev = Math.sqrt(variance);
  const stability = Math.max(0, 100 - stdDev * 2);

  // 調和度：火水バランスの偏りから計算（偏りが少ないほど調和）
  const fireWaterValues = directions.map(dir => scores[dir].fireWaterBalance);
  const fireWaterMean = fireWaterValues.reduce((sum, v) => sum + v, 0) / fireWaterValues.length;
  const fireWaterVariance = fireWaterValues.reduce((sum, v) => sum + Math.pow(v - fireWaterMean, 2), 0) / fireWaterValues.length;
  const fireWaterStdDev = Math.sqrt(fireWaterVariance);
  const harmony = Math.max(0, 100 - fireWaterStdDev);

  // エネルギー：総合スコアから計算
  const energy = mean;

  return {
    stability: Math.round(stability),
    harmony: Math.round(harmony),
    energy: Math.round(energy),
  };
}

/**
 * 火水バランスを計算
 */
function calculateFireWaterBalance(direction: HachigenDirection, score: number): number {
  // 各方位の特性に応じて火水バランスを計算
  const directionCharacteristics: Record<HachigenDirection, number> = {
    structure: 20, // 構造は火寄り（明確さ）
    flow: -10, // 流れは水寄り（柔軟性）
    reiCore: 0, // 霊核は中庸
    context: -20, // 文脈は水寄り（深さ）
    intent: 10, // 意図は火寄り（明確さ）
    environment: 0, // 外界は中庸
    temporal: -15, // 時間は水寄り（流れ）
    relation: -25, // 縁は水寄り（受容）
  };

  const baseBalance = directionCharacteristics[direction];
  
  // スコアが低い場合、バランスが崩れる
  const scoreImpact = (score - 70) / 2; // -35 〜 +15
  
  return Math.max(-100, Math.min(100, baseBalance + scoreImpact));
}

/**
 * 話題の遷移度を検出
 */
function detectTopicShift(messages: string[]): number {
  if (messages.length < 2) return 0;

  // 簡易的な話題遷移検出（実際にはより高度なNLP処理が必要）
  const lastMessage = messages[messages.length - 1];
  const previousMessage = messages[messages.length - 2];

  // 共通する単語の割合で話題の類似度を計算
  const lastWords = new Set(lastMessage.split(/\s+/));
  const previousWords = new Set(previousMessage.split(/\s+/));
  
  const commonWords = Array.from(lastWords).filter(word => previousWords.has(word));
  const similarity = commonWords.length / Math.max(lastWords.size, previousWords.size);
  
  // 類似度が低いほど話題遷移度が高い
  return 1 - similarity;
}
