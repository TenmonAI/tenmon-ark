/**
 * ============================================================
 *  TENMON-TRADE ENGINE — 統合トレードエンジン
 * ============================================================
 * 
 * 制約:
 * - EA化禁止
 * - 予測AI禁止
 * - ルールIF文禁止
 * - 状態遷移・抑制優先
 * 
 * フェーズ T-1: 観測のみ（取引命令は送らない）
 * 
 * 統合:
 * - Reishō / Phase Engine
 * - Kokūzō Event-Sourcing
 * - オフライン動作可能
 * ============================================================
 */

import MarketStateEngine from "./marketStateEngine";
import EntrySaturationGuard from "./entrySaturationGuard";
import LossQualityAnalyzer from "./lossQualityAnalyzer";
import KokuzoMemoryIntegration from "./kokuzoMemoryIntegration";
import MT5ExecutionBridge from "./mt5ExecutionBridge";
import TradeDecisionSynthesizer from "./decisionSynthesizer";
import MT5ZeroMQBridge from "./mt5ZeroMQBridge";
import type { MarketData, MarketStateResult } from "./marketStateEngine";
import type { EntryDirection, SaturationState } from "./entrySaturationGuard";
import type { TradeRecord, LossQualityResult } from "./lossQualityAnalyzer";
import type { ProhibitedPattern } from "./kokuzoMemoryIntegration";
import type { MT5Command } from "./mt5ExecutionBridge";
import type {
  Decision,
  DecisionContext,
  TradePhase,
  Candle,
  MarketState,
  LossQuality,
  EntryHistory,
} from "./types";
import { generatePhaseState } from "../reisho/phaseEngine";
import type { ReishoPhase } from "../reisho/phaseEngine";

/**
 * トレード観測結果
 */
export interface TradeObservation {
  marketState: MarketStateResult;
  saturationState: SaturationState;
  lossQuality: LossQualityResult;
  reishoPhase: ReishoPhase;
  timestamp: number;
  prohibitedPatterns: ProhibitedPattern[];
}

/**
 * TENMON-TRADE Engine
 * 
 * フェーズ T-1: 観測のみ
 */
export class TenmonTradeEngine {
  private marketStateEngine: MarketStateEngine;
  private entrySaturationGuard: EntrySaturationGuard;
  private lossQualityAnalyzer: LossQualityAnalyzer;
  private kokuzoMemoryIntegration: KokuzoMemoryIntegration;
  private mt5Bridge: MT5ExecutionBridge;
  private decisionSynthesizer: TradeDecisionSynthesizer;
  private zmqBridge: MT5ZeroMQBridge;
  private currentPhase: TradePhase = "T-1";
  private entryHistory: EntryHistory[] = [];

  constructor(zmqBindAddress?: string) {
    this.marketStateEngine = new MarketStateEngine();
    this.entrySaturationGuard = new EntrySaturationGuard();
    this.lossQualityAnalyzer = new LossQualityAnalyzer();
    this.kokuzoMemoryIntegration = new KokuzoMemoryIntegration();
    this.mt5Bridge = new MT5ExecutionBridge();
    this.decisionSynthesizer = new TradeDecisionSynthesizer();
    this.zmqBridge = new MT5ZeroMQBridge(zmqBindAddress);

    // MT5 命令リスナーを登録
    this.mt5Bridge.onCommand((command) => {
      this.handleMT5Command(command);
    });

    // ZeroMQ Bridge を初期化
    this.zmqBridge.initialize().catch((error) => {
      console.error("[TENMON-TRADE] Failed to initialize ZeroMQ bridge:", error);
    });
  }

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

  /**
   * ローソク足から決定を生成（中枢処理）
   */
  async decideFromCandles(
    symbol: string,
    candles: Candle[],
    direction?: EntryDirection
  ): Promise<Decision> {
    // 1. Market State Engine で市場状態を評価
    const marketState = this.marketStateEngine.evaluateMarketState(candles);

    // 2. Entry Saturation Guard で飽和状態を確認
    const lastCandle = candles[candles.length - 1];
    const priceKey = `${symbol}:${lastCandle.close}:${direction || "BUY"}`;
    const saturation = this.entrySaturationGuard.checkSaturation(
      priceKey,
      this.entryHistory.map((e) => ({
        symbol: e.symbol,
        price: e.price,
        direction: e.direction,
        timestamp: e.timestamp,
      }))
    );

    // 3. Loss Quality Analyzer で損失品質を分析
    const lossQuality = this.lossQualityAnalyzer.analyzeLoss(lastCandle);

    // 4. 決定コンテキストを構築
    const ctx: DecisionContext = {
      market: marketState,
      saturation,
      loss: lossQuality,
      phase: this.currentPhase,
      direction,
      auto: this.currentPhase === "T-3",
      rejectConfirmed: true, // デフォルトは true（実際は人間の判断が必要）
    };

    // 5. Decision Synthesizer で最終決定
    const decision = this.decisionSynthesizer.decide(ctx);

    // 6. Phase T-3 で EXECUTE 命令の場合のみ ZeroMQ で送信
    if (this.currentPhase === "T-3" && (decision === "EXECUTE_BUY" || decision === "EXECUTE_SELL")) {
      await this.zmqBridge.sendCommand({
        type: decision,
        symbol,
        price: lastCandle.close,
        direction: decision === "EXECUTE_BUY" ? "BUY" : "SELL",
        timestamp: Date.now(),
      });
    }

    // 7. STOP 命令の場合も ZeroMQ で送信
    if (decision === "STOP") {
      await this.zmqBridge.sendStop(symbol);
    }

    return decision;
  }

  /**
   * 市場データを観測
   */
  async observeMarket(
    marketData: MarketData,
    context?: string
  ): Promise<TradeObservation> {
    // 1. Market State Engine で市場状態を判定
    const marketState = await this.marketStateEngine.analyzeMarketState(
      marketData,
      context
    );

    // 2. Entry Saturation Guard で飽和状態を確認
    const saturationState = this.entrySaturationGuard.canEnter(
      marketData.symbol,
      marketData.price,
      "BUY" // デフォルト（実際は方向を決定する必要がある）
    );

    // 3. Loss Quality Analyzer で損失品質を分析
    const lossQuality = this.lossQualityAnalyzer.analyzeLossQuality();

    // 4. Reishō Phase を生成
    const phaseState = generatePhaseState(
      `${marketData.symbol} ${marketData.price}`
    );

    // 5. 禁止構文を検索
    const prohibitedPatterns =
      await this.kokuzoMemoryIntegration.searchProhibitedPatterns(
        marketData.symbol
      );

    // 6. 禁止構文を保存（必要に応じて）
    if (marketState.state === "STATE_BROKEN" || saturationState.isSaturated) {
      await this.kokuzoMemoryIntegration.saveProhibitedPattern({
        type:
          marketState.state === "STATE_BROKEN"
            ? "MARKET_STATE_BROKEN"
            : "SATURATION_EXCEEDED",
        symbol: marketData.symbol,
        price: marketData.price,
        reason: marketState.reason || saturationState.reason,
        timestamp: Date.now(),
        context: {
          marketState: marketState.state,
          saturationState: saturationState.isSaturated,
        },
      });
    }

    return {
      marketState,
      saturationState,
      lossQuality,
      reishoPhase: phaseState.phase,
      timestamp: Date.now(),
      prohibitedPatterns,
    };
  }

  /**
   * MT5 命令を処理
   */
  private async handleMT5Command(command: MT5Command): Promise<void> {
    // フェーズ T-1: 観測のみ
    // 命令を受信して記録するのみ（取引命令は送らない）

    if (command.type === "MARKET_DATA") {
      const marketData: MarketData = {
        symbol: command.data.symbol,
        price: command.data.price,
        timestamp: command.timestamp,
        volume: command.data.volume,
        spread: command.data.spread,
        volatility: command.data.volatility,
      };

      // 市場データを観測
      await this.observeMarket(marketData, "MT5");
    }

    if (command.type === "POSITION_STATUS") {
      // ポジション状態を記録（観測のみ）
      // 取引記録として保存
      if (command.data.exitPrice) {
        const trade: TradeRecord = {
          id: command.data.id || `trade-${Date.now()}`,
          symbol: command.data.symbol,
          entryPrice: command.data.entryPrice,
          exitPrice: command.data.exitPrice,
          direction: command.data.direction,
          entryTime: command.data.entryTime,
          exitTime: command.timestamp,
          pnl: command.data.pnl,
          volume: command.data.volume,
        };

        this.lossQualityAnalyzer.recordTrade(trade);
      }
    }
  }

  /**
   * エントリーを記録（観測のみ）
   */
  recordEntry(
    symbol: string,
    price: number,
    direction: EntryDirection
  ): SaturationState {
    return this.entrySaturationGuard.recordEntry(symbol, price, direction);
  }

  /**
   * 取引を記録（観測のみ）
   */
  recordTrade(trade: TradeRecord): void {
    this.lossQualityAnalyzer.recordTrade(trade);
  }

  /**
   * MT5 ブリッジを取得
   */
  getMT5Bridge(): MT5ExecutionBridge {
    return this.mt5Bridge;
  }

  /**
   * 観測結果を取得
   */
  getObservation(): {
    marketState: MarketStateResult | null;
    lossQuality: LossQualityResult;
  } {
    return {
      marketState: this.marketStateEngine.getCurrentState(),
      lossQuality: this.lossQualityAnalyzer.analyzeLossQuality(),
    };
  }
}

export default TenmonTradeEngine;

