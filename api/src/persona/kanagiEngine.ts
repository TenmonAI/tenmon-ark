// api/src/persona/kanagiEngine.ts

import { transitionAxis } from "./thinkingAxis.js";
import { determineKanagiPhase } from "./kanagi.js";
import type { ThinkingAxis } from "./thinkingAxis.js";
import type { KanagiPhase } from "./kanagi.js";
import {
  createInitialLoopState,
  observeLoop,
  resolveLoop,
  updateCenterState,
  type LoopState,
} from "./kanagiMetaObserver.js";
import {
  createContradictions,
  compressAtCenter,
  synthesize,
} from "./kanagiDialecticCore.js";
import type { KanagiTetraState } from "./types.js";

/**
 * ================================
 * KanagiEngine v1.0 (Frozen Core)
 * ================================
 *
 * 役割：
 * - 天津金木思考回路の「統合ゲート」
 * - 既存の thinkingAxis / KanagiPhase / KOKŪZŌ 影響を
 *   明示的な順序と制約で包む
 *
 * 方針：
 * - 新しい判断ロジックは作らない
 * - 既存実装を「順序付きで呼び出す」
 * - 不変核（Core / Prohibition）はここで凍結
 */

/**
 * 不変核（Frozen Core）
 * ※ 学習・入力・外部影響で変更不可
 */
const FROZEN_CORE = {
  separateBeforeDecide: true,
  keepUndetermined: true,
  doNotDefineCenter: true,
  doNotResolveBySingleFactor: true,
  prioritizeCirculation: true,
} as const;

/**
 * 禁止領域（Frozen Prohibition）
 */
const FROZEN_PROHIBITION = {
  noSingleAxisDecision: true,
  noImmediateConclusion: true,
  noAuthorityOverride: true,
  noExceptionForConsistency: true,
} as const;

/**
 * KanagiEngine 入力コンテキスト
 */
export type KanagiContext = {
  prevThinkingAxis: ThinkingAxis | null;
  input: string;
  conversationCount: number;
  sessionId?: string; // セッションID（ループ状態の永続化用）
  prevLoopState?: LoopState;
};

/**
 * KanagiEngine 出力
 */
export type KanagiResult = {
  thinkingAxis: ThinkingAxis;
  kanagiPhase: KanagiPhase;
  provisional: true;
  frozen: true;
  reason: "normal" | "force-transition" | "center" | "center-reorganizing" | "integration";
  isInCenter: boolean;
  tetraState?: KanagiTetraState; // 弁証核の状態
};

// ループ状態の永続化（セッション単位で保持）
const loopStateStore = new Map<string, LoopState>();

/**
 * ループ状態を取得（セッション単位）
 */
function getLoopState(sessionId: string): LoopState {
  return loopStateStore.get(sessionId) || createInitialLoopState();
}

/**
 * ループ状態を保存（セッション単位）
 */
function saveLoopState(sessionId: string, state: LoopState): void {
  loopStateStore.set(sessionId, state);
}

/**
 * ================================
 * KanagiEngine v1.0 本体
 * ================================
 */
export function runKanagiEngine(
  context: KanagiContext
): KanagiResult {
  // -------------------------------
  // Phase 0: 不変核チェック（明示）
  // -------------------------------
  // ※ 実装上は条件分岐しないが、
  //    ここが「Freeze点」であることを明示
  void FROZEN_CORE;
  void FROZEN_PROHIBITION;

  // -------------------------------
  // Phase 1: 思考軸遷移
  // -------------------------------
  // 既存の transitionAxis を唯一の遷移手段として使用
  const prevAxis: ThinkingAxis = context.prevThinkingAxis ?? "observational";
  let nextThinkingAxis = transitionAxis(
    prevAxis,
    context.input,
    context.conversationCount
  );

  // -------------------------------
  // Phase 2: 天津金木フェーズ決定
  // -------------------------------
  let kanagiPhase = determineKanagiPhase(nextThinkingAxis);
  
  // -------------------------------
  // Phase 3: ループ検知とCENTER状態制御（Frozen）
  // -------------------------------
  // セッションIDを使用（提供されない場合は会話回数から生成）
  const sessionId = context.sessionId || `kanagi-${context.conversationCount}`;
  
  // -------------------------------
  // Phase 2.5: 弁証核：矛盾の生成
  // -------------------------------
  // 入力から矛盾する解釈を生成（常に実行）
  const tetraState = createContradictions(context.input, sessionId);

  let loopState = context.prevLoopState || getLoopState(sessionId);

  // ループを観測（同一思考シグネチャの連続回数を監視）
  loopState = observeLoop(loopState, nextThinkingAxis, kanagiPhase);

  // ループを解決（強制遷移またはCENTER遷移を決定）
  const loopResolution = resolveLoop(loopState, kanagiPhase);

  // CENTER状態に入るべきか判定
  if (loopResolution.shouldEnterCenter) {
    loopState = updateCenterState(loopState, true);
    
    // -------------------------------
    // Phase 4: CENTER通過時の圧縮（弁証核）
    // -------------------------------
    // CENTER状態で矛盾を圧縮（要約）する
    const compressedTetra = compressAtCenter(tetraState, sessionId);
    
    // CENTER状態での蓄積度をチェック
    // 十分に蓄積されたら INTEGRATION へ遷移
    if (compressedTetra.centerAccumulation >= 2 && compressedTetra.interpretation.length >= 2) {
      // INTEGRATION フェーズへ遷移
      kanagiPhase = "INTEGRATION";
      
      // 観測円の生成（統合ではない）
      const synthesizedTetra = synthesize(compressedTetra, sessionId);
      
      saveLoopState(sessionId, loopState);
      return {
        thinkingAxis: nextThinkingAxis,
        kanagiPhase: "INTEGRATION",
        provisional: true,
        frozen: true,
        reason: "integration",
        isInCenter: false,
        tetraState: synthesizedTetra,
      };
    }
    
    // CENTER状態のまま（再編成中）
    saveLoopState(sessionId, loopState);
    return {
      thinkingAxis: nextThinkingAxis,
      kanagiPhase,
      provisional: true,
      frozen: true,
      reason: "center-reorganizing",
      isInCenter: true,
      tetraState: compressedTetra,
    };
  }

  // 強制遷移が必要な場合
  if (loopResolution.shouldForceTransition && loopResolution.forcedPhase) {
    kanagiPhase = loopResolution.forcedPhase;
    // 強制遷移後はループ状態をリセット
    loopState = {
      signature: `${nextThinkingAxis}-${kanagiPhase}`,
      consecutiveCount: 1,
      isInCenter: false,
    };
    saveLoopState(sessionId, loopState);
    return {
      thinkingAxis: nextThinkingAxis,
      kanagiPhase,
      provisional: true,
      frozen: true,
      reason: "force-transition",
      isInCenter: false,
      tetraState: tetraState, // 強制遷移時も矛盾状態を保持
    };
  }

  // 通常処理
  saveLoopState(sessionId, loopState);
  return {
    thinkingAxis: nextThinkingAxis,
    kanagiPhase,
    provisional: true,
    frozen: true,
    reason: "normal",
    isInCenter: false,
    tetraState: tetraState,
  };
}

/**
 * ================================
 * Freeze 状態の問い合わせ用
 * ================================
 */
export function isKanagiFrozen(): true {
  return true;
}

