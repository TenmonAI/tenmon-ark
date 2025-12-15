/**
 * ============================================================
 *  LOT MANAGER — ロット & 複利管理
 * ============================================================
 * 
 * 自動ルール:
 * - balance < 10,000,000 → AGGRESSIVE (0.3–0.6%)
 * - balance >= 10,000,000 → SAFE (0.1–0.2%)
 * ============================================================
 */

import { auditLog } from "./auditLog";

export type LotMode = "AGGRESSIVE" | "SAFE";

export interface LotStatus {
  balance: number;
  currentLot: number;
  mode: LotMode;
  maxLot: number;
  riskPerTrade: number;
  autoMode: LotMode; // 自動判定されたモード
  isOverridden: boolean; // 手動設定かどうか
}

// ロット設定（グローバル）
let lotConfig: LotStatus = {
  balance: 0,
  currentLot: 0.01,
  mode: "AGGRESSIVE",
  maxLot: 0.1,
  riskPerTrade: 0.3,
  autoMode: "AGGRESSIVE",
  isOverridden: false,
};

/**
 * 自動モードを計算
 */
function calculateAutoMode(balance: number): LotMode {
  return balance < 10_000_000 ? "AGGRESSIVE" : "SAFE";
}

/**
 * 自動リスク率を計算
 */
function calculateAutoRiskPerTrade(mode: LotMode): number {
  if (mode === "AGGRESSIVE") {
    return 0.3; // 0.3–0.6% の範囲（実装では動的に調整可能）
  }
  return 0.15; // 0.1–0.2% の範囲（実装では動的に調整可能）
}

/**
 * ロット状態を取得
 */
export function getLotStatus(): LotStatus {
  // 自動モードを再計算
  const autoMode = calculateAutoMode(lotConfig.balance);

  // 手動設定でない場合は自動モードを適用
  if (!lotConfig.isOverridden) {
    lotConfig.mode = autoMode;
    lotConfig.riskPerTrade = calculateAutoRiskPerTrade(autoMode);
  }

  return {
    ...lotConfig,
    autoMode,
  };
}

/**
 * 残高を更新（自動モード再計算）
 */
export function updateBalance(balance: number): void {
  lotConfig.balance = balance;

  // 手動設定でない場合は自動モードを適用
  if (!lotConfig.isOverridden) {
    const autoMode = calculateAutoMode(balance);
    lotConfig.mode = autoMode;
    lotConfig.riskPerTrade = calculateAutoRiskPerTrade(autoMode);
  }
}

/**
 * ロット設定を手動で上書き
 */
export function overrideLotConfig(
  config: {
    maxLot?: number;
    mode?: LotMode;
    riskPerTrade?: number;
  },
  userId: string = "TENMON",
  ipAddress?: string
): void {
  if (config.maxLot !== undefined) {
    lotConfig.maxLot = config.maxLot;
  }
  if (config.mode !== undefined) {
    lotConfig.mode = config.mode;
    lotConfig.isOverridden = true;
  }
  if (config.riskPerTrade !== undefined) {
    lotConfig.riskPerTrade = config.riskPerTrade;
  }

  // 監査ログに記録
  auditLog("LOT_OVERRIDE", config, userId, ipAddress);
}

/**
 * 手動設定をリセット（自動モードに戻す）
 */
export function resetToAutoMode(): void {
  lotConfig.isOverridden = false;
  const autoMode = calculateAutoMode(lotConfig.balance);
  lotConfig.mode = autoMode;
  lotConfig.riskPerTrade = calculateAutoRiskPerTrade(autoMode);
}

export default {
  getLotStatus,
  updateBalance,
  overrideLotConfig,
  resetToAutoMode,
};

