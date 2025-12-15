/**
 * ============================================================
 *  XAUUSD TRADE ENGINE — XAUUSD 1分足専用トレードエンジン
 * ============================================================
 * 
 * XAUUSD 1分足・裁量拡張ロジック
 * 
 * 目的:
 * - 勝ちを増やさず、負けを削る
 * - STATE / VOL / TIME / SATURATION / LOSS_QUALITY による抑制最優先
 * 
 * 制約:
 * - 予測モデル禁止
 * - 学習結果の即時反映禁止
 * - 連敗時ロット増加禁止
 * - 「入らない判断」を最優先
 * ============================================================
 */

import type { Candle, Decision, TradePhase, EntryHistory } from "../types";
import { getTimeRegime, getEntrySuppressionRate } from "./timeRegime";
import { classifyVolatility, calculateATR } from "./volatility";
import { evaluateMarketState, calculateRejectStrength, detectStructureBreak } from "./marketState";
import { checkSaturation, isLockExpired } from "./entrySaturation";
import {
  analyzeLoss,
  calculateATRTrend,
  countConsecutiveBearish,
  isRejectionShrinking,
} from "./lossQuality";
import { decide } from "./decision";
import type { MarketState } from "../types";
import type { LossQuality } from "../types";
import type { SaturationState } from "./entrySaturation";
import { SATURATION_PARAMS } from "./entrySaturation";
import type { TimeRegime } from "./timeRegime";
import type { VolatilityClass } from "./volatility";
import KokuzoMemoryIntegration from "../kokuzoMemoryIntegration";
import { getEmergencyStop } from "../emergencyStop";

/**
 * XAUUSD トレード観測結果
 */
export interface XAUUSDTradeObservation {
  timeRegime: TimeRegime;
  volClass: VolatilityClass;
  marketState: MarketState;
  saturation: SaturationState;
  lossQuality: LossQuality;
  decision: Decision;
  timestamp: number;
  logs: {
    atr: number;
    rejectStrength: number;
    structureBroken: boolean;
    consecutiveBearish: number;
    rejectionShrinking: boolean;
  };
}

/**
 * XAUUSD Trade Engine
 */
export class XAUUSDTradeEngine {
  private entryHistory: EntryHistory[] = [];
  private atrHistory: number[] = [];
  private currentPhase: TradePhase = "T-1";
  private coolDownUntil: number = 0; // クールダウン終了時刻
  private kokuzoMemory: KokuzoMemoryIntegration;

  /**
   * フェーズを設定
   */
  setPhase(phase: TradePhase): void {
    this.currentPhase = phase;
  }

  /**
   * フェーズを取得
   */
  getPhase(): TradePhase {
    return this.currentPhase;
  }

  constructor() {
    this.kokuzoMemory = new KokuzoMemoryIntegration();
  }

  /**
   * ローソク足から決定を生成（中枢処理）
   */
  async decideFromCandles(
    symbol: string,
    candles: Candle[],
    direction?: "BUY" | "SELL",
    serverTimeUTC?: number
  ): Promise<XAUUSDTradeObservation> {
    const now = serverTimeUTC || Date.now();
    const lastCandle = candles[candles.length - 1];

    // 1. 時間帯レジームを取得
    const timeRegime = getTimeRegime(now);

    // 2. ATR を計算
    const atr = calculateATR(candles);
    this.atrHistory.push(atr);
    if (this.atrHistory.length > 20) {
      this.atrHistory.shift();
    }

    // 3. ボラティリティを分類
    const volClass = classifyVolatility(atr);

    // 4. 反発強度を計算
    const rejectStrength = calculateRejectStrength(candles);

    // 5. 構造破壊を検出
    const structureBroken = detectStructureBreak(candles);

    // 6. 市場状態を評価
    const marketState = evaluateMarketState({
      atr,
      volClass,
      timeRegime,
      rejectStrength,
      structureBroken,
    });

    // 7. Kokūzō Memory で禁止構文を検索（STEP 6）
    const prohibitedPatterns = await this.kokuzoMemory.searchProhibitedPatterns(
      symbol
    );
    if (prohibitedPatterns.length > 0) {
      // 禁止構文が一致した場合、即 STOP
      return {
        timeRegime,
        volClass,
        marketState: "STATE_BROKEN",
        saturation: { locked: true, reason: "KOKUZO_PROHIBITED_PATTERN" },
        lossQuality: "DANGEROUS",
        decision: "STOP",
        timestamp: now,
        logs: {
          atr,
          rejectStrength,
          structureBroken,
          consecutiveBearish,
          rejectionShrinking,
        },
      };
    }

    // 8. エントリー飽和状態をチェック（STEP 3: ロック解除条件を実装）
    let saturation = checkSaturation(this.entryHistory, lastCandle.close, now);
    
    // ロック解除条件（すべて必須）:
    if (saturation.locked) {
      // 1. 価格帯ブレイク
      const priceBreak = 
        this.entryHistory.length > 0 &&
        Math.abs(lastCandle.close - this.entryHistory[this.entryHistory.length - 1].price) > SATURATION_PARAMS.SAME_PRICE_PIPS * 2;
      
      // 2. ATR 回復
      const atrRecovery = 
        this.atrHistory.length >= 2 &&
        this.atrHistory[this.atrHistory.length - 1] > this.atrHistory[this.atrHistory.length - 2] * 1.2;
      
      // 3. ロック時間経過
      const lockExpired = isLockExpired(saturation, now);
      
      if (priceBreak || atrRecovery || lockExpired) {
        saturation = { ...saturation, locked: false, unlockAfter: undefined };
      }
    }

    // 9. ATR トレンドを計算
    const atrTrend = calculateATRTrend(this.atrHistory);

    // 10. 連続陰線数を計算
    const consecutiveBearish = countConsecutiveBearish(candles);

    // 11. 反発量が縮小しているか判定
    const rejectionShrinking = isRejectionShrinking(candles);

    // 12. 損失品質を分析（STEP 5）
    const lossQuality = analyzeLoss({
      candle: lastCandle,
      atr,
      atrTrend,
      consecutiveBearish,
      rejectionShrinking,
    });

    // 13. クールダウン中かチェック（STEP 5: クールダウン中は PROPOSE すら禁止）
    if (lossQuality === "DANGEROUS") {
      this.coolDownUntil = now + 30 * 60 * 1000; // 30分クールダウン
    }

    if (now < this.coolDownUntil) {
      // クールダウン中は提案すら禁止
      return {
        timeRegime,
        volClass,
        marketState: "STATE_BROKEN",
        saturation: { locked: true, reason: "COOLDOWN" },
        lossQuality: "DANGEROUS",
        decision: "STOP",
        timestamp: now,
        logs: {
          atr,
          rejectStrength,
          structureBroken,
          consecutiveBearish,
          rejectionShrinking,
        },
      };
    }

    // 14. Time Regime Filter（STEP 4: NO_TRADE / LOW_EXPECTANCY の完全遮断）
    if (timeRegime === "NO_TRADE") {
      return {
        timeRegime,
        volClass,
        marketState: "STATE_BROKEN",
        saturation: { locked: true, reason: "NO_TRADE_TIME" },
        lossQuality,
        decision: "STOP",
        timestamp: now,
        logs: {
          atr,
          rejectStrength,
          structureBroken,
          consecutiveBearish,
          rejectionShrinking,
        },
      };
    }

    if (timeRegime === "LOW_EXPECTANCY" && this.currentPhase !== "T-1") {
      // アジア時間・流動性死時間での突撃を完全排除
      return {
        timeRegime,
        volClass,
        marketState,
        saturation,
        lossQuality,
        decision: "WAIT",
        timestamp: now,
        logs: {
          atr,
          rejectStrength,
          structureBroken,
          consecutiveBearish,
          rejectionShrinking,
        },
      };
    }

    // 15. 緊急停止状態を取得
    const emergencyStop = getEmergencyStop();

    // 16. 最終決定を統合（緊急停止を考慮）
    const decision = decide(
      {
        market: marketState,
        saturation,
        lossQuality,
        phase: this.currentPhase,
        direction,
        timeRegime,
        volClass,
      },
      emergencyStop
    );

    // 16. エントリー抑制率を適用（Phase T-1 では適用しない）
    if (this.currentPhase !== "T-1") {
      const suppressionRate = getEntrySuppressionRate(timeRegime);
      if (suppressionRate > 0 && Math.random() < suppressionRate) {
        // 抑制される
        return {
          timeRegime,
          volClass,
          marketState,
          saturation,
          lossQuality,
          decision: "WAIT",
          timestamp: now,
          logs: {
            atr,
            rejectStrength,
            structureBroken,
            consecutiveBearish,
            rejectionShrinking,
          },
        };
      }
    }

    // STEP 2: Phase T-1 観測ログ完全化（必須項目をJSON形式で出力）
    const observationLog = {
      time: now,
      price: lastCandle.close,
      direction: direction || "NONE",
      timeRegime,
      atr,
      volClass,
      marketState,
      rejectStrength,
      saturationCount: saturation.count || 0,
      lossQuality,
      decision: decision === "WAIT" || decision === "LOCK" || decision === "STOP" ? decision : "WAIT", // Phase T-1 では WAIT / LOCK / STOP のみ
    };

    // ログ出力（STEP 2）
    console.log("[XAUUSD-TRADE] Observation Log:", JSON.stringify(observationLog, null, 2));

    // 決定ログに追加
    const { addDecisionLog } = await import("../decisionLog");
    addDecisionLog({
      time: now,
      direction: direction || "NONE",
      decision,
      reason: `Market: ${marketState}, Saturation: ${saturation.locked ? "LOCKED" : "OK"}, Loss: ${lossQuality}`,
    });

    return {
      timeRegime,
      volClass,
      marketState,
      saturation,
      lossQuality,
      decision,
      timestamp: now,
      logs: {
        atr,
        rejectStrength,
        structureBroken,
        consecutiveBearish,
        rejectionShrinking,
      },
    };
  }

  /**
   * エントリーを記録
   */
  recordEntry(symbol: string, price: number, direction: "BUY" | "SELL"): void {
    this.entryHistory.push({
      symbol,
      price,
      direction,
      timestamp: Date.now(),
    });

    // 履歴を保持（24時間以内のみ）
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.entryHistory = this.entryHistory.filter((e) => e.timestamp > oneDayAgo);
  }

  /**
   * エントリー履歴を取得
   */
  getEntryHistory(): EntryHistory[] {
    return [...this.entryHistory];
  }

  /**
   * エントリー履歴をクリア
   */
  clearEntryHistory(): void {
    this.entryHistory = [];
  }
}

export default XAUUSDTradeEngine;

