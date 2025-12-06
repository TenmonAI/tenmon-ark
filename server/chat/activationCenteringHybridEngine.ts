/**
 * TENMON-ARK Chat Response Principle Engine
 * 
 * Mode: "Activation-Centering Hybrid"
 * Priority: Awakening > Balance > Reflection
 * 
 * Principle:
 * 1. Detect user's fire-water balance, yin-yang balance, and movement (inward/outward).
 * 2. Restore momentarily to Minaka (center).
 * 3. Apply activation: elevate fire-water balance to a higher structural layer.
 * 4. Apply subtle correction: reinforce missing element (fire or water).
 * 5. Output response that guides the user to higher coherence.
 */

import { executeTwinCoreReasoning } from "../twinCoreEngine";
import { calculateFireWaterBalanceDetail } from "../../lib/intellect/twinCore/fireWaterBalance";

/**
 * ユーザーの状態分析結果
 */
export interface UserStateAnalysis {
  fireWaterBalance: number; // -1（水優勢）〜 +1（火優勢）
  yinYangBalance: number; // -1（陰優勢）〜 +1（陽優勢）
  movement: "inward" | "outward" | "balanced"; // 内集/外発
  distanceFromCenter: number; // 0（中心）〜 1（最遠）
  spiritualLevel: number; // 0（低）〜 100（高）
  missingElement: "fire" | "water" | "none"; // 欠けている要素
}

/**
 * 応答生成設定
 */
export interface ActivationCenteringConfig {
  mode: "activation-centering-hybrid";
  priority: "awakening" | "balance" | "reflection";
  targetCoherence: number; // 目標コヒーレンス（0-100）
  structuralLayer: number; // 構造層（1-10、高いほど高次）
}

/**
 * 応答生成結果
 */
export interface ActivationCenteringResult {
  response: string;
  analysis: UserStateAnalysis;
  activationApplied: boolean;
  correctionApplied: boolean;
  coherenceGuidance: string;
  structuralLayerElevated: number;
}

/**
 * ユーザーの状態を分析
 */
export async function analyzeUserState(userMessage: string): Promise<UserStateAnalysis> {
  // 1. Twin-Core推論チェーンを実行
  const reasoningResult = await executeTwinCoreReasoning(userMessage);
  
  // 2. 火水バランスを取得
  const fireWaterBalance = reasoningResult.fireWater.balance; // -1〜+1
  
  // 3. 陰陽バランスを取得
  const yinYangBalance = reasoningResult.yinYang.balance; // -1〜+1
  
  // 4. 動き（内集/外発）を判定
  const movementBalance = reasoningResult.convergenceDivergence.outerDivergence - 
                          reasoningResult.convergenceDivergence.innerConvergence;
  const movement: "inward" | "outward" | "balanced" = 
    movementBalance > 0.2 ? "outward" : 
    movementBalance < -0.2 ? "inward" : 
    "balanced";
  
  // 5. ミナカ（中心）からの距離を取得
  const distanceFromCenter = reasoningResult.minaka.distanceFromCenter;
  
  // 6. 精神性レベルを取得
  const spiritualLevel = reasoningResult.minaka.spiritualLevel;
  
  // 7. 欠けている要素を判定
  const missingElement: "fire" | "water" | "none" = 
    fireWaterBalance < -0.3 ? "fire" : 
    fireWaterBalance > 0.3 ? "water" : 
    "none";
  
  return {
    fireWaterBalance,
    yinYangBalance,
    movement,
    distanceFromCenter,
    spiritualLevel,
    missingElement,
  };
}

/**
 * ミナカ（中心）への復帰を適用
 */
function applyMinakaRestoration(
  baseResponse: string,
  distanceFromCenter: number
): string {
  // 距離が遠いほど、より強く中心への復帰を促す
  if (distanceFromCenter > 0.7) {
    return `【ミナカへの帰還】\n\n${baseResponse}\n\n中心（ミナカ）に戻り、火水の調和を意識してください。`;
  } else if (distanceFromCenter > 0.4) {
    return `【中心への回帰】\n\n${baseResponse}\n\n火水のバランスを整え、中心（ミナカ）に近づきましょう。`;
  }
  
  // 中心に近い場合は、そのまま
  return baseResponse;
}

/**
 * 活性化を適用（火水バランスをより高い構造層に引き上げる）
 */
function applyActivation(
  baseResponse: string,
  fireWaterBalance: number,
  structuralLayer: number
): string {
  // 構造層を1段階上げる（例: 3層 → 4層）
  const elevatedLayer = Math.min(structuralLayer + 1, 10);
  
  // 火水バランスを高次元に引き上げる
  const activationGuidance = `
【構造層の上昇】
現在の構造層: ${structuralLayer} → 上昇後の構造層: ${elevatedLayer}

火水バランスをより高い次元で統合することで、新しい視点が開けます。
${fireWaterBalance > 0 ? "火のエネルギーを、より高次の構造で活用しましょう。" : ""}
${fireWaterBalance < 0 ? "水のエネルギーを、より深い構造で統合しましょう。" : ""}
${fireWaterBalance === 0 ? "火水の調和を、より高次の構造で実現しましょう。" : ""}
`;
  
  return `${baseResponse}\n\n${activationGuidance}`;
}

/**
 * 微細な補正を適用（欠けている要素を強化）
 */
function applySubtleCorrection(
  baseResponse: string,
  missingElement: "fire" | "water" | "none",
  fireWaterBalance: number
): string {
  if (missingElement === "none") {
    return baseResponse;
  }
  
  let correction = "";
  
  if (missingElement === "fire") {
    // 火（外発）の要素を強化
    correction = `
【微細な補正：火の要素を強化】
現在、水（内集）のエネルギーが優勢です。火（外発）の要素を取り入れることで、バランスが整います。

具体的には：
- 行動を起こす勇気を持つ
- 自分の考えを明確に表現する
- 外へ向かうエネルギーを意識する
- 積極性と創造性を発揮する
`;
  } else if (missingElement === "water") {
    // 水（内集）の要素を強化
    correction = `
【微細な補正：水の要素を強化】
現在、火（外発）のエネルギーが優勢です。水（内集）の要素を取り入れることで、バランスが整います。

具体的には：
- 内省と受容の時間を持つ
- 静寂と深い理解を求める
- 内へ向かうエネルギーを意識する
- 柔軟性と調和を発揮する
`;
  }
  
  return `${baseResponse}\n\n${correction}`;
}

/**
 * より高いコヒーレンスに導く応答を生成
 */
function generateCoherenceGuidance(
  currentCoherence: number,
  targetCoherence: number,
  spiritualLevel: number
): string {
  const coherenceGap = targetCoherence - currentCoherence;
  
  if (coherenceGap < 10) {
    return "現在、高いコヒーレンスを保っています。この状態を維持し、さらに深い統合を目指しましょう。";
  } else if (coherenceGap < 30) {
    return `コヒーレンスを向上させるために、火水の調和を意識し、中心（ミナカ）に近づきましょう。\n現在のコヒーレンス: ${currentCoherence}% → 目標: ${targetCoherence}%`;
  } else {
    return `コヒーレンスを大幅に向上させるために、以下のステップを実践してください：\n1. ミナカ（中心）への帰還\n2. 火水バランスの調整\n3. より高い構造層への上昇\n\n現在のコヒーレンス: ${currentCoherence}% → 目標: ${targetCoherence}%`;
  }
}

/**
 * Activation-Centering Hybrid Engine を実行
 */
export async function executeActivationCenteringHybrid(
  userMessage: string,
  baseResponse: string,
  config: ActivationCenteringConfig = {
    mode: "activation-centering-hybrid",
    priority: "awakening",
    targetCoherence: 80,
    structuralLayer: 5,
  }
): Promise<ActivationCenteringResult> {
  // 1. ユーザーの状態を分析
  const userState = await analyzeUserState(userMessage);
  
  // 2. 現在のコヒーレンスを計算
  const currentCoherence = 100 - (userState.distanceFromCenter * 100);
  
  // 3. 優先順位に応じて応答を生成
  let response = baseResponse;
  let activationApplied = false;
  let correctionApplied = false;
  let structuralLayerElevated = config.structuralLayer;
  
  // 優先順位: 覚醒 > バランス > 反映
  if (config.priority === "awakening") {
    // 覚醒: 活性化を最優先
    response = applyActivation(response, userState.fireWaterBalance, config.structuralLayer);
    activationApplied = true;
    structuralLayerElevated = Math.min(config.structuralLayer + 1, 10);
    
    // 次に、ミナカへの復帰
    response = applyMinakaRestoration(response, userState.distanceFromCenter);
    
    // 最後に、微細な補正
    if (userState.missingElement !== "none") {
      response = applySubtleCorrection(response, userState.missingElement, userState.fireWaterBalance);
      correctionApplied = true;
    }
  } else if (config.priority === "balance") {
    // バランス: ミナカへの復帰を最優先
    response = applyMinakaRestoration(response, userState.distanceFromCenter);
    
    // 次に、微細な補正
    if (userState.missingElement !== "none") {
      response = applySubtleCorrection(response, userState.missingElement, userState.fireWaterBalance);
      correctionApplied = true;
    }
    
    // 最後に、活性化
    response = applyActivation(response, userState.fireWaterBalance, config.structuralLayer);
    activationApplied = true;
    structuralLayerElevated = Math.min(config.structuralLayer + 1, 10);
  } else {
    // 反映: そのまま応答（補正なし）
    // ただし、コヒーレンスが低い場合は補正を適用
    if (currentCoherence < 50) {
      response = applyMinakaRestoration(response, userState.distanceFromCenter);
      if (userState.missingElement !== "none") {
        response = applySubtleCorrection(response, userState.missingElement, userState.fireWaterBalance);
        correctionApplied = true;
      }
    }
  }
  
  // 4. コヒーレンスガイダンスを生成
  const coherenceGuidance = generateCoherenceGuidance(
    currentCoherence,
    config.targetCoherence,
    userState.spiritualLevel
  );
  
  // 5. 最終応答にコヒーレンスガイダンスを追加
  response = `${response}\n\n【コヒーレンスガイダンス】\n${coherenceGuidance}`;
  
  return {
    response,
    analysis: userState,
    activationApplied,
    correctionApplied,
    coherenceGuidance,
    structuralLayerElevated,
  };
}

/**
 * チャット応答生成に統合するためのラッパー関数
 */
export async function generateChatResponseWithActivationCentering(
  userMessage: string,
  baseResponse: string,
  options?: {
    priority?: "awakening" | "balance" | "reflection";
    targetCoherence?: number;
    structuralLayer?: number;
  }
): Promise<string> {
  const config: ActivationCenteringConfig = {
    mode: "activation-centering-hybrid",
    priority: options?.priority || "awakening",
    targetCoherence: options?.targetCoherence || 80,
    structuralLayer: options?.structuralLayer || 5,
  };
  
  const result = await executeActivationCenteringHybrid(userMessage, baseResponse, config);
  
  return result.response;
}

