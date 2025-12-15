/**
 * ============================================================
 *  LOSS QUALITY ANALYZER — 損失品質分析器
 * ============================================================
 * 
 * 制約:
 * - 健全/危険逆行の判定
 * - 状態遷移ベース（IF文禁止）
 * 
 * フェーズ T-1: 観測のみ（取引命令は送らない）
 * ============================================================
 */

import type { LossQuality, Candle } from "./types";

/**
 * 損失品質（旧型との互換性）
 */
export type LossQualityLegacy = "健全" | "危険逆行";

/**
 * 取引記録
 */
export interface TradeRecord {
  id: string;
  symbol: string;
  entryPrice: number;
  exitPrice: number;
  direction: "BUY" | "SELL";
  entryTime: number;
  exitTime: number;
  pnl: number; // 損益
  volume: number;
}

/**
 * 損失品質分析結果
 */
export interface LossQualityResult {
  quality: LossQuality;
  confidence: number; // 0-1
  reason: string;
  riskLevel: number; // 0-1（高いほど危険）
  timestamp: number;
}

/**
 * Loss Quality Analyzer
 * 
 * 健全/危険逆行を判定（状態遷移ベース）
 */
export class LossQualityAnalyzer {
  private tradeHistory: TradeRecord[] = [];
  private readonly maxHistorySize = 1000;

  /**
   * 取引を記録（観測のみ）
   */
  recordTrade(trade: TradeRecord): void {
    this.tradeHistory.push(trade);
    if (this.tradeHistory.length > this.maxHistorySize) {
      this.tradeHistory.shift();
    }
  }

  /**
   * ローソク足から損失品質を分析
   */
  analyzeLoss(candle: Candle): LossQuality {
    // 長いウィック（上下どちらか）を検出
    const bodyRange = Math.abs(candle.close - candle.open);
    const upperWick = candle.high - Math.max(candle.open, candle.close);
    const lowerWick = Math.min(candle.open, candle.close) - candle.low;
    const longWick = (upperWick / candle.range > 0.5) || (lowerWick / candle.range > 0.5);

    // ボリューム拡大を検出（簡易版）
    const volExpansion = this.volExpansion();

    // 状態遷移テーブル（IF文禁止）
    const qualityTable: Array<{
      condition: (longWick: boolean, volExpansion: boolean) => boolean;
      quality: LossQuality;
    }> = [
      {
        condition: (longWick, volExpansion) => longWick && !volExpansion,
        quality: "DANGEROUS",
      },
      {
        condition: () => true,
        quality: "HEALTHY",
      },
    ];

    const quality = qualityTable.find((q) => q.condition(longWick, volExpansion))?.quality || "HEALTHY";

    return quality;
  }

  /**
   * ボリューム拡大を検出（簡易版）
   */
  private volExpansion(): boolean {
    // 実際の実装では、直近のボリューム履歴を比較
    // ここでは簡易版として false を返す
    return false;
  }

  /**
   * 損失品質を分析（旧メソッド、互換性のため）
   */
  analyzeLossQuality(
    recentTrades: TradeRecord[] = this.tradeHistory
  ): LossQualityResult {
    // 直近の損失取引を抽出
    const lossTrades = recentTrades
      .filter((t) => t.pnl < 0)
      .slice(-10); // 直近10件

    if (lossTrades.length === 0) {
      return {
        quality: "健全",
        confidence: 1.0,
        reason: "損失取引なし",
        riskLevel: 0.0,
        timestamp: Date.now(),
      };
    }

    // 状態遷移ベースの分析（IF文禁止）
    const analysis = this.computeLossQuality(lossTrades);

    return {
      quality: analysis.quality,
      confidence: analysis.confidence,
      reason: analysis.reason,
      riskLevel: analysis.riskLevel,
      timestamp: Date.now(),
    };
  }

  /**
   * 損失品質を計算（状態遷移ベース、IF文禁止）
   */
  private computeLossQuality(
    lossTrades: TradeRecord[]
  ): {
    quality: LossQuality;
    confidence: number;
    reason: string;
    riskLevel: number;
  } {
    // 条件1: 損失の連続性（連続損失が多いほど危険）
    const consecutiveLosses = this.countConsecutiveLosses(lossTrades);
    const consecutiveScore = Math.min(1, consecutiveLosses / 5); // 5回連続で最大

    // 条件2: 損失の拡大傾向（損失が拡大しているほど危険）
    const lossExpansion = this.computeLossExpansion(lossTrades);
    const expansionScore = Math.abs(lossExpansion);

    // 条件3: 損失の割合（損失額の割合が高いほど危険）
    const totalLoss = lossTrades.reduce((sum, t) => sum + Math.abs(t.pnl), 0);
    const totalVolume = lossTrades.reduce((sum, t) => sum + t.volume, 0);
    const lossRatio = totalVolume > 0 ? totalLoss / totalVolume : 0;
    const ratioScore = Math.min(1, lossRatio / 0.1); // 10%で最大

    // 統合リスクスコア（0-1）
    const riskScore =
      (consecutiveScore * 0.4 + expansionScore * 0.3 + ratioScore * 0.3) /
      1.0;

    // 状態遷移テーブル（IF文禁止）
    const qualityTable: Array<{
      min: number;
      max: number;
      quality: LossQuality;
      reason: string;
    }> = [
      {
        min: 0.7,
        max: 1.0,
        quality: "危険逆行",
        reason: "高いリスク検出",
      },
      {
        min: 0.0,
        max: 0.7,
        quality: "健全",
        reason: "健全な損失パターン",
      },
    ];

    // 状態遷移テーブルから品質を決定
    const quality = qualityTable.find(
      (q) => riskScore >= q.min && riskScore < q.max
    ) || qualityTable[qualityTable.length - 1];

    return {
      quality: quality.quality,
      confidence: riskScore,
      reason: quality.reason,
      riskLevel: riskScore,
    };
  }

  /**
   * 連続損失をカウント
   */
  private countConsecutiveLosses(trades: TradeRecord[]): number {
    let maxConsecutive = 0;
    let currentConsecutive = 0;

    for (const trade of trades) {
      if (trade.pnl < 0) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }

    return maxConsecutive;
  }

  /**
   * 損失拡大傾向を計算
   */
  private computeLossExpansion(trades: TradeRecord[]): number {
    if (trades.length < 2) {
      return 0;
    }

    // 損失額の時系列変化
    const losses = trades.map((t) => Math.abs(t.pnl));
    const firstHalf = losses.slice(0, Math.floor(losses.length / 2));
    const secondHalf = losses.slice(Math.floor(losses.length / 2));

    const firstAvg =
      firstHalf.reduce((sum, l) => sum + l, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, l) => sum + l, 0) / secondHalf.length;

    // 拡大率（正の値は拡大、負の値は縮小）
    return firstAvg > 0 ? (secondAvg - firstAvg) / firstAvg : 0;
  }

  /**
   * 取引履歴を取得
   */
  getTradeHistory(): TradeRecord[] {
    return [...this.tradeHistory];
  }

  /**
   * 取引履歴をクリア
   */
  clearHistory(): void {
    this.tradeHistory = [];
  }
}

export default LossQualityAnalyzer;

