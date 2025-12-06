/**
 * Intellect Fusion Engine (IFE) v5.5
 * 
 * 天聞アークOS知能拡張：Over-Intelligence Layer
 * 
 * GPT / Claude / Gemini を下位モジュールとして統合し、
 * 上位OSとしての知能を発揮する統合エンジン
 * 
 * パイプライン:
 * 1. preprocessTwinCore: 入力の前処理（Twin-Core構文解析）
 * 2. executeHighLevelReasoning: 上位推論（OS設計/統合/意図解析）
 * 3. executeMultiModelRouter: モデル選択と実行
 * 4. enhanceSemantics: 意味拡張（天聞アークOS文体への変換）
 * 5. postprocessTwinCore: 後処理（Twin-Core構文の付与）
 * 6. applyUserSync: ユーザー同期（個別最適化）
 */

import { preprocessTwinCore, preprocessTwinCoreLite, type TwinCorePreprocessResult } from './twinCore/preprocessTwinCore';
import { postprocessTwinCore, postprocessTwinCoreLite, removeTwinCoreTags } from './twinCore/postprocessTwinCore';
import { calculateFireWaterBalanceDetail, type FireWaterBalanceDetail } from './twinCore/fireWaterBalance';
import { calculateFiveElementFlowDetail } from './twinCore/fiveElementFlow';
import { executeMultiModelRouter, detectTaskType, type TaskType, type RoutingResult } from './router';
import { enhanceSemantics, enhanceSemanticLite, type SemanticAugmentationResult } from './enhance';
import { executeHighLevelReasoning, detectReasoningTaskType, type ReasoningTaskType, type ReasoningResult } from './reasoning';
import { syncWithUser, applyUserSync, convertSimpleToDetailedProfile, type SimpleUserProfile as UserProfile, type UserSyncResult } from './userSync';

/**
 * IFE実行オプション
 */
export interface IFEOptions {
  // ユーザープロファイル（個別最適化用）
  userProfile?: UserProfile;
  
  // タスクタイプ（指定しない場合は自動検出）
  taskType?: TaskType;
  
  // 推論タスクタイプ（指定しない場合は自動検出）
  reasoningTaskType?: ReasoningTaskType;
  
  // 優先度設定
  prioritizeCost?: boolean;
  prioritizeSpeed?: boolean;
  prioritizeQuality?: boolean;
  
  // 簡易モード（パフォーマンス重視）
  liteMode?: boolean;
  
  // 推論を有効化
  enableReasoning?: boolean;
  
  // ユーザー同期を有効化
  enableUserSync?: boolean;
}

/**
 * IFE実行結果
 */
export interface IFEResult {
  // 最終出力
  output: string;
  
  // 前処理結果
  preprocessing: TwinCorePreprocessResult | Partial<TwinCorePreprocessResult>;
  
  // 推論結果
  reasoning?: ReasoningResult;
  
  // ルーティング結果
  routing: RoutingResult;
  
  // 意味拡張結果
  semanticAugmentation?: SemanticAugmentationResult;
  
  // ユーザー同期結果
  userSync?: UserSyncResult;
  
  // メタデータ
  metadata: {
    processingTime: number; // ミリ秒
    totalCost: number;
    liteMode: boolean;
  };
}

/**
 * Intellect Fusion Engine (IFE) を実行
 */
export async function executeIFE(
  input: string,
  options: IFEOptions = {}
): Promise<IFEResult> {
  const startTime = Date.now();
  
  const {
    userProfile,
    taskType,
    reasoningTaskType,
    prioritizeCost = false,
    prioritizeSpeed = false,
    prioritizeQuality = true,
    liteMode = false,
    enableReasoning = true,
    enableUserSync = true,
  } = options;
  
  // 1. 前処理（Twin-Core構文解析）
  let preprocessing: TwinCorePreprocessResult | Partial<TwinCorePreprocessResult>;
  if (liteMode) {
    preprocessing = await preprocessTwinCoreLite(input);
  } else {
    preprocessing = await preprocessTwinCore(input);
  }
  
  // 2. 上位推論（オプション）
  let reasoning: ReasoningResult | undefined;
  if (enableReasoning && !liteMode) {
    const detectedReasoningTaskType = reasoningTaskType || detectReasoningTaskType(input);
    reasoning = await executeHighLevelReasoning(
      input,
      detectedReasoningTaskType,
      preprocessing as TwinCorePreprocessResult
    );
  }
  
  // 3. モデル選択と実行
  const detectedTaskType = taskType || detectTaskType(input, preprocessing as TwinCorePreprocessResult);
  const { output: rawOutput, routing } = await executeMultiModelRouter(
    input,
    preprocessing as TwinCorePreprocessResult,
    {
      taskType: detectedTaskType,
      prioritizeCost,
      prioritizeSpeed,
      prioritizeQuality,
    }
  );
  
  // 4. 意味拡張（天聞アークOS文体への変換）
  let semanticAugmentation: SemanticAugmentationResult | undefined;
  let enhancedOutput = rawOutput;
  
  if (!liteMode) {
    const fireWaterDetail = calculateFireWaterBalanceDetail(rawOutput);
    semanticAugmentation = await enhanceSemantics(
      rawOutput,
      preprocessing as TwinCorePreprocessResult,
      fireWaterDetail
    );
    enhancedOutput = semanticAugmentation.augmented;
  } else {
    enhancedOutput = await enhanceSemanticLite(
      rawOutput,
      preprocessing.fireWater?.balance || 'balanced'
    );
  }
  
  // 5. 後処理（Twin-Core構文の付与）
  let postprocessedOutput: string;
  if (!liteMode) {
    const postprocessResult = await postprocessTwinCore(
      enhancedOutput,
      preprocessing as TwinCorePreprocessResult
    );
    postprocessedOutput = removeTwinCoreTags(postprocessResult.processed);
  } else {
    postprocessedOutput = await postprocessTwinCoreLite(
      enhancedOutput,
      preprocessing.fireWater?.balance || 'balanced'
    );
  }
  
  // 6. ユーザー同期（個別最適化）
  let userSync: UserSyncResult | undefined;
  let finalOutput = postprocessedOutput;
  // ユーザー同期を実行
  if (enableUserSync && userProfile) {
    const detailedProfile = convertSimpleToDetailedProfile(userProfile);
    userSync = syncWithUser(detailedProfile);
    finalOutput = applyUserSync(postprocessedOutput, userSync);
  }
  
  const processingTime = Date.now() - startTime;
  
  return {
    output: finalOutput,
    preprocessing,
    reasoning,
    routing,
    semanticAugmentation,
    userSync,
    metadata: {
      processingTime,
      totalCost: routing.estimatedCost,
      liteMode,
    },
  };
}

/**
 * IFE簡易版（パフォーマンス重視）
 */
export async function executeIFELite(
  input: string,
  options: Pick<IFEOptions, 'prioritizeCost' | 'prioritizeSpeed' | 'prioritizeQuality'> = {}
): Promise<Pick<IFEResult, 'output' | 'routing' | 'metadata'>> {
  return executeIFE(input, {
    ...options,
    liteMode: true,
    enableReasoning: false,
    enableUserSync: false,
  });
}

/**
 * IFEバッチ処理（複数入力を一括処理）
 */
export async function executeIFEBatch(
  inputs: string[],
  options: IFEOptions = {}
): Promise<IFEResult[]> {
  const results: IFEResult[] = [];
  
  for (const input of inputs) {
    const result = await executeIFE(input, options);
    results.push(result);
  }
  
  return results;
}

/**
 * IFEストリーミング処理（リアルタイム出力）
 */
export async function* executeIFEStream(
  input: string,
  options: IFEOptions = {}
): AsyncGenerator<{
  stage: 'preprocessing' | 'reasoning' | 'routing' | 'enhancement' | 'postprocessing' | 'userSync' | 'complete';
  data: Partial<IFEResult>;
}> {
  const startTime = Date.now();
  
  // 1. 前処理
  const preprocessing = options.liteMode
    ? await preprocessTwinCoreLite(input)
    : await preprocessTwinCore(input);
  
  yield {
    stage: 'preprocessing',
    data: { preprocessing },
  };
  
  // 2. 推論
  let reasoning: ReasoningResult | undefined;
  if (options.enableReasoning !== false && !options.liteMode) {
    const detectedReasoningTaskType = options.reasoningTaskType || detectReasoningTaskType(input);
    reasoning = await executeHighLevelReasoning(
      input,
      detectedReasoningTaskType,
      preprocessing as TwinCorePreprocessResult
    );
    
    yield {
      stage: 'reasoning',
      data: { preprocessing, reasoning },
    };
  }
  
  // 3. ルーティング
  const detectedTaskType = options.taskType || detectTaskType(input, preprocessing as TwinCorePreprocessResult);
  const { output: rawOutput, routing } = await executeMultiModelRouter(
    input,
    preprocessing as TwinCorePreprocessResult,
    {
      taskType: detectedTaskType,
      prioritizeCost: options.prioritizeCost,
      prioritizeSpeed: options.prioritizeSpeed,
      prioritizeQuality: options.prioritizeQuality,
    }
  );
  
  yield {
    stage: 'routing',
    data: { preprocessing, reasoning, routing, output: rawOutput },
  };
  
  // 4. 意味拡張
  let semanticAugmentation: SemanticAugmentationResult | undefined;
  let enhancedOutput = rawOutput;
  
  if (!options.liteMode) {
    const fireWaterDetail = calculateFireWaterBalanceDetail(rawOutput);
    semanticAugmentation = await enhanceSemantics(
      rawOutput,
      preprocessing as TwinCorePreprocessResult,
      fireWaterDetail
    );
    enhancedOutput = semanticAugmentation.augmented;
  } else {
    enhancedOutput = await enhanceSemanticLite(
      rawOutput,
      preprocessing.fireWater?.balance || 'balanced'
    );
  }
  
  yield {
    stage: 'enhancement',
    data: { preprocessing, reasoning, routing, semanticAugmentation, output: enhancedOutput },
  };
  
  // 5. 後処理
  let postprocessedOutput: string;
  if (!options.liteMode) {
    const postprocessResult = await postprocessTwinCore(
      enhancedOutput,
      preprocessing as TwinCorePreprocessResult
    );
    postprocessedOutput = removeTwinCoreTags(postprocessResult.processed);
  } else {
    postprocessedOutput = await postprocessTwinCoreLite(
      enhancedOutput,
      preprocessing.fireWater?.balance || 'balanced'
    );
  }
  
  yield {
    stage: 'postprocessing',
    data: { preprocessing, reasoning, routing, semanticAugmentation, output: postprocessedOutput },
  };
  
  // 6. ユーザー同期
  let userSync: UserSyncResult | undefined;
  let finalOutput = postprocessedOutput;
  
  if (options.enableUserSync !== false && options.userProfile && !options.liteMode) {
    const detailedProfile = convertSimpleToDetailedProfile(options.userProfile);
    userSync = syncWithUser(detailedProfile);
    finalOutput = applyUserSync(postprocessedOutput, userSync);
    
    yield {
      stage: 'userSync',
      data: { preprocessing, reasoning, routing, semanticAugmentation, userSync, output: finalOutput },
    };
  }
  
  const processingTime = Date.now() - startTime;
  
  yield {
    stage: 'complete',
    data: {
      output: finalOutput,
      preprocessing,
      reasoning,
      routing,
      semanticAugmentation,
      userSync,
      metadata: {
        processingTime,
        totalCost: routing.estimatedCost,
        liteMode: options.liteMode || false,
      },
    },
  };
}

// エクスポート
export * from './twinCore/preprocessTwinCore';
export * from './twinCore/postprocessTwinCore';
export * from './twinCore/fireWaterBalance';
export { 
  FIVE_ELEMENT_MAP, 
  calculateFiveElementFlowDetail, 
  visualizeFiveElementFlow, 
  applyFiveElementFlowToText, 
  generateFiveElementCycle, 
  checkFiveElementCompatibility 
} from './twinCore/fiveElementFlow';
export type { FiveElementProperties, FiveElementFlowDetail } from './twinCore/fiveElementFlow';
export * from './router';
export * from './enhance';
export * from './reasoning';
export * from './userSync';
