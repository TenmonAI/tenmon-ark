/**
 * ============================================================
 *  ENTRY SATURATION — Entry Saturation Guard（XAUUSD特化）
 * ============================================================
 * 
 * XAUUSD 1分足専用のエントリー飽和ガード
 * 
 * パラメータ:
 * - SAME_PRICE_PIPS: 0.15（同一価格帯の範囲）
 * - MAX_ENTRIES: 3（最大エントリー数）
 * - LOCK_MINUTES: 7（ロック時間）
 * ============================================================
 */

import type { EntryHistory } from "../types";

/**
 * 飽和パラメータ
 */
export const SATURATION_PARAMS = {
  SAME_PRICE_PIPS: 0.15, // 同一価格帯の範囲（pips）
  MAX_ENTRIES: 3, // 最大エントリー数
  LOCK_MINUTES: 7, // ロック時間（分）
};

/**
 * 飽和状態
 */
export interface SaturationState {
  locked: boolean;
  unlockAfter?: number; // ロック解除時刻（timestamp）
  count?: number;
  reason?: string;
}

/**
 * 飽和状態をチェック
 */
export function checkSaturation(
  entries: EntryHistory[],
  currentPrice: number,
  now: number
): SaturationState {
  if (entries.length === 0) {
    return { locked: false };
  }

  // 同一価格帯のエントリーをフィルタ
  const recent = entries.filter(
    (e) => Math.abs(e.price - currentPrice) <= SATURATION_PARAMS.SAME_PRICE_PIPS
  );

  // 状態遷移テーブル（IF文禁止）
  const saturationTable: Array<{
    condition: (count: number) => boolean;
    locked: boolean;
    reason: string;
  }> = [
    {
      condition: (count) => count >= SATURATION_PARAMS.MAX_ENTRIES,
      locked: true,
      reason: "SATURATION_LOCK",
    },
    {
      condition: () => true,
      locked: false,
      reason: "",
    },
  ];

  const count = recent.length;
  const state = saturationTable.find((s) => s.condition(count)) || saturationTable[0];

  return {
    locked: state.locked,
    unlockAfter: state.locked
      ? now + SATURATION_PARAMS.LOCK_MINUTES * 60 * 1000
      : undefined,
    count,
    reason: state.reason,
  };
}

/**
 * ロック解除時刻をチェック
 */
export function isLockExpired(saturation: SaturationState, now: number): boolean {
  if (!saturation.locked || !saturation.unlockAfter) {
    return true;
  }

  return now >= saturation.unlockAfter;
}

export default {
  SATURATION_PARAMS,
  checkSaturation,
  isLockExpired,
};

