/**
 * ============================================================
 *  ENTRY SATURATION GUARD — エントリー飽和ガード
 * ============================================================
 * 
 * 制約:
 * - 同一価格帯×方向×3回制限（最重要）
 * - 状態遷移ベース（IF文禁止）
 * 
 * フェーズ T-1/T-2/T-3: 全フェーズで有効
 * ============================================================
 */

import type { EntryDirection, EntryHistory, SaturationState } from "./types";

/**
 * ロック閾値
 */
const LOCK_THRESHOLD = 3;

/**
 * エントリー記録
 */
export interface EntryRecord {
  symbol: string;
  price: number; // 価格帯（丸め済み）
  direction: EntryDirection;
  timestamp: number;
}

/**
 * Entry Saturation Guard
 * 
 * 同一価格帯×方向×3回制限を実装
 */
export class EntrySaturationGuard {
  private entries: EntryRecord[] = [];
  private readonly maxHistorySize = 1000;
  private readonly priceBandSize = 0.001; // 価格帯のサイズ（0.1%）

  /**
   * エントリーを記録（観測のみ）
   */
  recordEntry(
    symbol: string,
    price: number,
    direction: EntryDirection
  ): SaturationState {
    // 価格帯を丸める
    const priceBand = Math.round(price / this.priceBandSize) * this.priceBandSize;

    const entry: EntryRecord = {
      symbol,
      price: priceBand,
      direction,
      timestamp: Date.now(),
    };

    // エントリーを追加
    this.entries.push(entry);
    if (this.entries.length > this.maxHistorySize) {
      this.entries.shift();
    }

    // 飽和状態を計算
    return this.computeSaturationState(symbol, priceBand, direction);
  }

  /**
   * 飽和状態をチェック（最重要）
   */
  checkSaturation(
    key: string,
    history: EntryHistory[]
  ): SaturationState {
    const count = this.samePriceSameDirCount(key, history);
    
    // 状態遷移テーブル（IF文禁止）
    const saturationTable: Array<{
      condition: (count: number) => boolean;
      locked: boolean;
      reason: string;
    }> = [
      {
        condition: (count) => count >= LOCK_THRESHOLD,
        locked: true,
        reason: "SATURATION_LOCK",
      },
      {
        condition: () => true,
        locked: false,
        reason: "",
      },
    ];

    const state = saturationTable.find((s) => s.condition(count)) || saturationTable[0];

    return {
      locked: state.locked,
      reason: state.reason,
      count,
      threshold: LOCK_THRESHOLD,
    };
  }

  /**
   * 同一価格・同一方向のエントリー数をカウント
   */
  private samePriceSameDirCount(
    key: string,
    history: EntryHistory[]
  ): number {
    // key の形式: "symbol:price:direction"
    const [symbol, priceStr, direction] = key.split(":");
    const price = parseFloat(priceStr);

    const priceBand = Math.round(price / this.priceBandSize) * this.priceBandSize;

    return history.filter(
      (e) =>
        e.symbol === symbol &&
        Math.round(e.price / this.priceBandSize) * this.priceBandSize === priceBand &&
        e.direction === direction &&
        Date.now() - e.timestamp < 24 * 60 * 60 * 1000 // 24時間以内
    ).length;
  }

  /**
   * 飽和状態を計算（状態遷移ベース、IF文禁止）
   */
  private computeSaturationState(
    symbol: string,
    priceBand: number,
    direction: EntryDirection
  ): SaturationState {
    // 同一価格帯×方向のエントリー数をカウント
    const recentEntries = this.entries.filter(
      (e) =>
        e.symbol === symbol &&
        e.price === priceBand &&
        e.direction === direction &&
        Date.now() - e.timestamp < 24 * 60 * 60 * 1000 // 24時間以内
    );

    const count = recentEntries.length;
    const maxCount = 3; // 3回制限

    // 状態遷移テーブル（IF文禁止）
    const saturationTable: Array<{
      min: number;
      max: number;
      isSaturated: boolean;
      reason: string;
    }> = [
      {
        min: maxCount,
        max: Infinity,
        isSaturated: true,
        reason: `同一価格帯×方向で${maxCount}回以上`,
      },
      {
        min: 0,
        max: maxCount,
        isSaturated: false,
        reason: "エントリー可能",
      },
    ];

    // 状態遷移テーブルから状態を決定
    const state = saturationTable.find(
      (s) => count >= s.min && count < s.max
    ) || saturationTable[saturationTable.length - 1];

    return {
      isSaturated: state.isSaturated,
      currentCount: count,
      maxCount,
      priceBand,
      direction,
      reason: state.reason,
    };
  }

  /**
   * エントリーが可能か確認
   */
  canEnter(
    symbol: string,
    price: number,
    direction: EntryDirection
  ): SaturationState {
    const priceBand = Math.round(price / this.priceBandSize) * this.priceBandSize;
    return this.computeSaturationState(symbol, priceBand, direction);
  }

  /**
   * エントリー履歴を取得
   */
  getEntryHistory(symbol?: string): EntryRecord[] {
    if (symbol) {
      return this.entries.filter((e) => e.symbol === symbol);
    }
    return [...this.entries];
  }

  /**
   * エントリー履歴をクリア
   */
  clearHistory(): void {
    this.entries = [];
  }
}

export default EntrySaturationGuard;

