// api/src/persona/kanagiEngine.ts

import { transitionAxis } from "./thinkingAxis.js";
import { determineKanagiPhase } from "./kanagi.js";
import type { ThinkingAxis } from "./thinkingAxis.js";
import type { KanagiPhase } from "./kanagi.js";

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
};

/**
 * KanagiEngine 出力
 */
export type KanagiResult = {
  thinkingAxis: ThinkingAxis;
  kanagiPhase: KanagiPhase;
  provisional: true;
  frozen: true;
};

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
  const nextThinkingAxis = transitionAxis(
    prevAxis,
    context.input,
    context.conversationCount
  );

  // -------------------------------
  // Phase 2: 天津金木フェーズ決定
  // -------------------------------
  const kanagiPhase = determineKanagiPhase(nextThinkingAxis);

  // -------------------------------
  // Phase 3: 暫定出力
  // -------------------------------
  // ・常に provisional
  // ・中心は定義しない
  // ・確定出力は別レイヤで行う
  return {
    thinkingAxis: nextThinkingAxis,
    kanagiPhase,
    provisional: true,
    frozen: true,
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

