// KanagiEngine v1.0: Loop Detection and CENTER State Control (Frozen)

import type { ThinkingAxis } from "./thinkingAxis.js";
import type { KanagiPhase } from "./kanagi.js";

/**
 * 思考シグネチャ（同一思考パターンの識別用）
 */
type ThinkingSignature = `${ThinkingAxis}-${KanagiPhase}`;

/**
 * ループ状態
 */
export type LoopState = {
  signature: ThinkingSignature | null;
  consecutiveCount: number;
  isInCenter: boolean;
};

/**
 * ループ検知の閾値（Frozen: 変更不可）
 */
const LOOP_THRESHOLDS = {
  FORCE_TRANSITION: 2, // 内集が2回続いたら R-OUT に強制遷移
  ENTER_CENTER: 3, // 3回続いたら CENTER に遷移
} as const;

/**
 * 初期ループ状態
 */
export function createInitialLoopState(): LoopState {
  return {
    signature: null,
    consecutiveCount: 0,
    isInCenter: false,
  };
}

/**
 * ループを観測（同一思考シグネチャの連続回数を監視）
 */
export function observeLoop(
  currentState: LoopState,
  thinkingAxis: ThinkingAxis,
  kanagiPhase: KanagiPhase
): LoopState {
  const newSignature: ThinkingSignature = `${thinkingAxis}-${kanagiPhase}`;

  // CENTER状態の場合は、ループ検知をスキップ
  if (currentState.isInCenter) {
    return {
      ...currentState,
      signature: newSignature,
      consecutiveCount: 0, // CENTER状態ではカウントをリセット
    };
  }

  // 同一シグネチャが続いているかチェック
  if (currentState.signature === newSignature) {
    return {
      ...currentState,
      signature: newSignature,
      consecutiveCount: currentState.consecutiveCount + 1,
    };
  }

  // シグネチャが変わった場合はリセット
  return {
    signature: newSignature,
    consecutiveCount: 1,
    isInCenter: false,
  };
}

/**
 * ループを解決（強制遷移またはCENTER遷移を決定）
 */
export function resolveLoop(
  loopState: LoopState,
  currentPhase: KanagiPhase
): {
  shouldForceTransition: boolean;
  forcedPhase: KanagiPhase | null;
  shouldEnterCenter: boolean;
} {
  // CENTER状態の場合は、何も強制しない
  if (loopState.isInCenter) {
    return {
      shouldForceTransition: false,
      forcedPhase: null,
      shouldEnterCenter: false,
    };
  }

  // 内集（L-IN）が連続しているかチェック
  const isInnerConvergence = currentPhase === "L-IN";
  const consecutiveCount = loopState.consecutiveCount;

  // 3回続いたら CENTER に遷移
  if (isInnerConvergence && consecutiveCount >= LOOP_THRESHOLDS.ENTER_CENTER) {
    return {
      shouldForceTransition: false,
      forcedPhase: null,
      shouldEnterCenter: true,
    };
  }

  // 2回続いたら R-OUT に強制遷移
  if (isInnerConvergence && consecutiveCount >= LOOP_THRESHOLDS.FORCE_TRANSITION) {
    return {
      shouldForceTransition: true,
      forcedPhase: "R-OUT",
      shouldEnterCenter: false,
    };
  }

  // それ以外は通常処理
  return {
    shouldForceTransition: false,
    forcedPhase: null,
    shouldEnterCenter: false,
  };
}

/**
 * CENTER状態に入るべきか判定
 */
export function shouldEnterCenter(loopState: LoopState): boolean {
  return loopState.isInCenter || loopState.consecutiveCount >= LOOP_THRESHOLDS.ENTER_CENTER;
}

/**
 * CENTER状態を更新
 */
export function updateCenterState(
  loopState: LoopState,
  shouldEnter: boolean
): LoopState {
  if (shouldEnter) {
    return {
      ...loopState,
      isInCenter: true,
      consecutiveCount: 0, // CENTER状態ではカウントをリセット
    };
  }

  // CENTER状態から抜ける（新しい入力でリセット）
  if (loopState.isInCenter) {
    return {
      signature: null,
      consecutiveCount: 0,
      isInCenter: false,
    };
  }

  return loopState;
}

