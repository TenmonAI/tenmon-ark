/**
 * ============================================================
 *  MARKET STATE ENGINE — 市場状態判定エンジン
 * ============================================================
 * 
 * 制約:
 * - EA化禁止
 * - 予測AI禁止
 * - ルールIF文禁止
 * - 状態遷移・抑制優先
 * 
 * フェーズ T-1/T-2/T-3: 判断は 100% TENMON-ARK
 * ============================================================
 */

import type { ReishoPhase } from "../reisho/phaseEngine";
import { generatePhaseState } from "../reisho/phaseEngine";
import { computeReishoSignature } from "../reisho/reishoKernel";
import type { Candle, MarketState } from "./types";

/**
 * 最小ボラティリティ
 */
const MIN_VOL = 0.0001;

/**
 * 最小速度
 */
const MIN_SPEED = 0.0001;

/**
 * 市場データ（観測のみ）
 */
export interface MarketData {
  symbol: string;
  price: number;
  timestamp: number;
  volume?: number;
  spread?: number;
  volatility?: number;
}

/**
 * 構造破壊を検出
 */
function breakStructure(candles: Candle[]): boolean {
  if (candles.length < 3) return false;

  // 直近3本のローソク足で構造破壊を判定
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const prev2 = candles[candles.length - 3];

  // 高値・安値の連続的な破壊を検出
  const highBreak = last.high > prev.high && prev.high > prev2.high;
  const lowBreak = last.low < prev.low && prev.low < prev2.low;

  // 急激な方向転換を検出
  const reversal = (last.close > last.open && prev.close < prev.open) ||
                   (last.close < last.open && prev.close > prev.open);

  return highBreak || lowBreak || reversal;
}

/**
 * 標準偏差を計算
 */
function std(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * 市場状態の判定結果
 */
export interface MarketStateResult {
  state: MarketState;
  confidence: number; // 0-1
  reishoPhase: ReishoPhase;
  fireWaterBalance: number; // -1 (水優勢) ～ +1 (火優勢)
  reason: string;
  timestamp: number;
}

/**
 * Market State Engine
 * 
 * 状態遷移ベースの判定（IF文禁止）
 * - STATE_VALID: 健全な市場状態（取引可能）
 * - STATE_WEAK: 弱い市場状態（抑制推奨）
 * - STATE_BROKEN: 壊れた市場状態（取引禁止）
 */
export class MarketStateEngine {
  private stateHistory: MarketStateResult[] = [];
  private readonly maxHistorySize = 100;

  /**
   * ローソク足から市場状態を評価（中枢判定）
   */
  evaluateMarketState(candles: Candle[]): MarketState {
    if (candles.length === 0) return "STATE_BROKEN";

    const last = candles[candles.length - 1];
    const vol = std(candles.map((c) => c.range));
    const speed = Math.abs(last.close - last.open);

    // 状態遷移テーブル（IF文禁止）
    const stateTable: Array<{
      condition: (vol: number, speed: number, broken: boolean) => boolean;
      state: MarketState;
    }> = [
      {
        condition: (vol, speed, broken) => broken,
        state: "STATE_BROKEN",
      },
      {
        condition: (vol, speed, broken) => vol < MIN_VOL || speed < MIN_SPEED,
        state: "STATE_WEAK",
      },
      {
        condition: () => true,
        state: "STATE_VALID",
      },
    ];

    const broken = breakStructure(candles);
    const state = stateTable.find((s) => s.condition(vol, speed, broken))?.state || "STATE_BROKEN";

    return state;
  }

  /**
   * 市場状態を判定（状態遷移ベース）
   */
  async analyzeMarketState(
    marketData: MarketData,
    context?: string
  ): Promise<MarketStateResult> {
    // Reishō Phase を生成（市場データから構造的意図を抽出）
    const marketText = this.marketDataToText(marketData, context);
    const phaseState = generatePhaseState(marketText);
    const reishoSignature = computeReishoSignature(marketText);

    // 状態遷移テーブル（IF文禁止）
    const stateTransition = this.computeStateTransition(
      marketData,
      phaseState.fireWaterBalance,
      reishoSignature.reishoValue
    );

    const result: MarketStateResult = {
      state: stateTransition.state,
      confidence: stateTransition.confidence,
      reishoPhase: phaseState.phase,
      fireWaterBalance: phaseState.fireWaterBalance,
      reason: stateTransition.reason,
      timestamp: Date.now(),
    };

    // 状態履歴に追加
    this.stateHistory.push(result);
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }

    return result;
  }

  /**
   * 市場データをテキストに変換（Reishō 処理用）
   */
  private marketDataToText(marketData: MarketData, context?: string): string {
    const parts: string[] = [
      `symbol: ${marketData.symbol}`,
      `price: ${marketData.price}`,
    ];

    if (marketData.volume !== undefined) {
      parts.push(`volume: ${marketData.volume}`);
    }

    if (marketData.spread !== undefined) {
      parts.push(`spread: ${marketData.spread}`);
    }

    if (marketData.volatility !== undefined) {
      parts.push(`volatility: ${marketData.volatility}`);
    }

    if (context) {
      parts.push(`context: ${context}`);
    }

    return parts.join(" ");
  }

  /**
   * 状態遷移を計算（IF文禁止、状態遷移テーブル使用）
   */
  private computeStateTransition(
    marketData: MarketData,
    fireWaterBalance: number,
    reishoValue: number
  ): {
    state: MarketState;
    confidence: number;
    reason: string;
  } {
    // 状態遷移テーブル（IF文禁止）
    // 各条件を数値化して、状態遷移テーブルで判定

    // 条件1: スプレッド（小さいほど健全）
    const spreadScore = marketData.spread
      ? Math.max(0, 1 - marketData.spread / 0.001) // 0.001 を基準
      : 0.5;

    // 条件2: ボラティリティ（適度な範囲が健全）
    const volatilityScore = marketData.volatility
      ? Math.max(0, 1 - Math.abs(marketData.volatility - 0.02) / 0.02) // 0.02 を基準
      : 0.5;

    // 条件3: Reishō 値（高いほど健全）
    const reishoScore = reishoValue;

    // 条件4: 火水バランス（均衡が健全）
    const balanceScore = 1 - Math.abs(fireWaterBalance);

    // 統合スコア（0-1）
    const totalScore =
      (spreadScore * 0.3 +
        volatilityScore * 0.3 +
        reishoScore * 0.2 +
        balanceScore * 0.2) /
      1.0;

    // 状態遷移テーブル（IF文禁止）
    const stateTable: Array<{
      min: number;
      max: number;
      state: MarketState;
      reason: string;
    }> = [
      {
        min: 0.7,
        max: 1.0,
        state: "STATE_VALID",
        reason: "健全な市場状態",
      },
      {
        min: 0.4,
        max: 0.7,
        state: "STATE_WEAK",
        reason: "弱い市場状態",
      },
      {
        min: 0.0,
        max: 0.4,
        state: "STATE_BROKEN",
        reason: "壊れた市場状態",
      },
    ];

    // 状態遷移テーブルから状態を決定
    const transition = stateTable.find(
      (t) => totalScore >= t.min && totalScore < t.max
    ) || stateTable[stateTable.length - 1];

    return {
      state: transition.state,
      confidence: totalScore,
      reason: transition.reason,
    };
  }

  /**
   * 状態履歴を取得
   */
  getStateHistory(): MarketStateResult[] {
    return [...this.stateHistory];
  }

  /**
   * 現在の状態を取得
   */
  getCurrentState(): MarketStateResult | null {
    return this.stateHistory.length > 0
      ? this.stateHistory[this.stateHistory.length - 1]
      : null;
  }
}

export default MarketStateEngine;

