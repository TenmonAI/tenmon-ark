/**
 * ============================================================
 *  EMERGENCY STOP — 緊急停止状態管理
 * ============================================================
 * 
 * グローバルな緊急停止状態を管理
 * ============================================================
 */

/**
 * 緊急停止状態
 */
export interface EmergencyStopState {
  all: boolean;
  buy: boolean;
  sell: boolean;
}

// 緊急停止状態（グローバル）
let emergencyStop: EmergencyStopState = {
  all: false,
  buy: false,
  sell: false,
};

/**
 * 緊急停止状態を取得
 */
export function getEmergencyStop(): EmergencyStopState {
  return { ...emergencyStop };
}

/**
 * 緊急停止状態を設定
 */
export async function setEmergencyStop(
  mode: "ALL" | "BUY" | "SELL" | "OFF",
  userId: string = "TENMON",
  ipAddress?: string
): Promise<void> {
  if (mode === "ALL") {
    emergencyStop = { all: true, buy: true, sell: true };
  } else if (mode === "BUY") {
    emergencyStop = { ...emergencyStop, buy: true };
  } else if (mode === "SELL") {
    emergencyStop = { ...emergencyStop, sell: true };
  } else if (mode === "OFF") {
    emergencyStop = { all: false, buy: false, sell: false };
  }

  // 監査ログに記録
  const { auditLog } = await import("./auditLog");
  auditLog("EMERGENCY_STOP", { mode }, userId, ipAddress);
}

export default {
  getEmergencyStop,
  setEmergencyStop,
};

