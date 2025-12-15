/**
 * ============================================================
 *  TENMON-TRADE ROUTER — tRPC API Router
 * ============================================================
 * 
 * フェーズ T-1: 観測のみ（取引命令は送らない）
 * ============================================================
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import TenmonTradeEngine from "../trade/tradeEngine";
import type { MarketData } from "../trade/marketStateEngine";
import type { EntryDirection } from "../trade/entrySaturationGuard";
import type { TradeRecord } from "../trade/lossQualityAnalyzer";
import type { MT5Command } from "../trade/mt5ExecutionBridge";
import type { Candle, Decision, TradePhase } from "../trade/types";

// シングルトンインスタンス
let tradeEngine: TenmonTradeEngine | null = null;

function getTradeEngine(): TenmonTradeEngine {
  if (!tradeEngine) {
    tradeEngine = new TenmonTradeEngine();
  }
  return tradeEngine;
}

export const tenmonTradeRouter = router({
  /**
   * 市場データを観測
   */
  observeMarket: protectedProcedure
    .input(
      z.object({
        symbol: z.string(),
        price: z.number(),
        volume: z.number().optional(),
        spread: z.number().optional(),
        volatility: z.number().optional(),
        context: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const engine = getTradeEngine();

      const marketData: MarketData = {
        symbol: input.symbol,
        price: input.price,
        timestamp: Date.now(),
        volume: input.volume,
        spread: input.spread,
        volatility: input.volatility,
      };

      return await engine.observeMarket(marketData, input.context);
    }),

  /**
   * エントリーを記録（観測のみ）
   */
  recordEntry: protectedProcedure
    .input(
      z.object({
        symbol: z.string(),
        price: z.number(),
        direction: z.enum(["BUY", "SELL"]),
      })
    )
    .mutation(async ({ input }) => {
      const engine = getTradeEngine();
      return engine.recordEntry(
        input.symbol,
        input.price,
        input.direction
      );
    }),

  /**
   * 取引を記録（観測のみ）
   */
  recordTrade: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        symbol: z.string(),
        entryPrice: z.number(),
        exitPrice: z.number(),
        direction: z.enum(["BUY", "SELL"]),
        entryTime: z.number(),
        exitTime: z.number(),
        pnl: z.number(),
        volume: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const engine = getTradeEngine();

      const trade: TradeRecord = {
        id: input.id,
        symbol: input.symbol,
        entryPrice: input.entryPrice,
        exitPrice: input.exitPrice,
        direction: input.direction,
        entryTime: input.entryTime,
        exitTime: input.exitTime,
        pnl: input.pnl,
        volume: input.volume,
      };

      engine.recordTrade(trade);
      return { success: true };
    }),

  /**
   * MT5 命令を受信（観測のみ）
   */
  receiveMT5Command: protectedProcedure
    .input(
      z.object({
        type: z.enum([
          "MARKET_DATA",
          "POSITION_STATUS",
          "ORDER_STATUS",
          "ACCOUNT_STATUS",
        ]),
        data: z.record(z.any()),
      })
    )
    .mutation(async ({ input }) => {
      const engine = getTradeEngine();
      const bridge = engine.getMT5Bridge();

      const command: MT5Command = {
        type: input.type,
        data: input.data,
        timestamp: Date.now(),
        source: "MT5",
      };

      bridge.receiveCommand(command);
      return { success: true };
    }),

  /**
   * 観測結果を取得
   */
  getObservation: protectedProcedure.query(async () => {
    const engine = getTradeEngine();
    return engine.getObservation();
  }),

  /**
   * ローソク足から決定を生成（中枢処理）
   */
  decideFromCandles: protectedProcedure
    .input(
      z.object({
        symbol: z.string(),
        candles: z.array(
          z.object({
            time: z.number(),
            open: z.number(),
            high: z.number(),
            low: z.number(),
            close: z.number(),
            volume: z.number(),
            range: z.number(),
          })
        ),
        direction: z.enum(["BUY", "SELL"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const engine = getTradeEngine();
      const candles: Candle[] = input.candles.map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        range: c.range,
      }));

      return await engine.decideFromCandles(
        input.symbol,
        candles,
        input.direction
      );
    }),

  /**
   * フェーズを設定
   */
  setPhase: protectedProcedure
    .input(
      z.object({
        phase: z.enum(["T-1", "T-2", "T-3"]),
      })
    )
    .mutation(async ({ input }) => {
      const engine = getTradeEngine();
      engine.setPhase(input.phase);
      return { success: true, phase: input.phase };
    }),

  /**
   * フェーズを取得
   */
  getPhase: protectedProcedure.query(async () => {
    const engine = getTradeEngine();
    return { phase: engine.getPhase() };
  }),

  /**
   * XAUUSD 1分足から決定を生成（XAUUSD専用）
   */
  xauusdDecideFromCandles: protectedProcedure
    .input(
      z.object({
        symbol: z.string().default("XAUUSD"),
        candles: z.array(
          z.object({
            time: z.number(),
            open: z.number(),
            high: z.number(),
            low: z.number(),
            close: z.number(),
            volume: z.number(),
            range: z.number(),
          })
        ),
        direction: z.enum(["BUY", "SELL"]).optional(),
        serverTimeUTC: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // XAUUSD Trade Engine を使用
      const { XAUUSDTradeEngine } = await import("../trade/xauusd/xauusdTradeEngine");
      const xauusdEngine = new XAUUSDTradeEngine();
      xauusdEngine.setPhase(getTradeEngine().getPhase());

      const candles: Candle[] = input.candles.map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        range: c.range,
      }));

      const observation = await xauusdEngine.decideFromCandles(
        input.symbol,
        candles,
        input.direction,
        input.serverTimeUTC
      );

      return observation;
    }),

  /**
   * XAUUSD エントリーを記録
   */
  xauusdRecordEntry: protectedProcedure
    .input(
      z.object({
        symbol: z.string().default("XAUUSD"),
        price: z.number(),
        direction: z.enum(["BUY", "SELL"]),
      })
    )
    .mutation(async ({ input }) => {
      const { XAUUSDTradeEngine } = await import("../trade/xauusd/xauusdTradeEngine");
      const xauusdEngine = new XAUUSDTradeEngine();
      xauusdEngine.recordEntry(input.symbol, input.price, input.direction);
      return { success: true };
    }),

  /**
   * XAUUSD エントリー履歴を取得
   */
  xauusdGetEntryHistory: protectedProcedure.query(async () => {
    const { XAUUSDTradeEngine } = await import("../trade/xauusd/xauusdTradeEngine");
    const xauusdEngine = new XAUUSDTradeEngine();
    return xauusdEngine.getEntryHistory();
  }),

  /**
   * 禁止構文を検索
   */
  searchProhibitedPatterns: protectedProcedure
    .input(
      z.object({
        symbol: z.string().optional(),
        type: z
          .enum([
            "SATURATION_EXCEEDED",
            "MARKET_STATE_BROKEN",
            "LOSS_QUALITY_DANGEROUS",
            "ENTRY_REJECTED",
          ])
          .optional(),
      })
    )
    .query(async ({ input }) => {
      const engine = getTradeEngine();
      const kokuzo = (engine as any).kokuzoMemoryIntegration;

      return await kokuzo.searchProhibitedPatterns(
        input.symbol,
        input.type
      );
    }),
});

