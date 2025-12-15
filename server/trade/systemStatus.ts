/**
 * ============================================================
 *  SYSTEM STATUS — システム状態
 * ============================================================
 */

import { getXAUUSDTradeEngine } from "./tradeSystemInitializer";
import { getEmergencyStop } from "./emergencyStop";
import { getPhase } from "./phaseController";

export interface SystemStatus {
  mt5: "CONNECTED" | "DISCONNECTED";
  zeromq: "OK" | "NG";
  dataFeed: "LIVE" | "MANUAL";
  latencyMs: number;
  phase: string;
  emergencyStop: {
    all: boolean;
    buy: boolean;
    sell: boolean;
  };
}

// システム状態（グローバル）
let systemStatus: SystemStatus = {
  mt5: "DISCONNECTED",
  zeromq: "NG",
  dataFeed: "MANUAL",
  latencyMs: 0,
  phase: "T-1",
  emergencyStop: {
    all: false,
    buy: false,
    sell: false,
  },
};

/**
 * システム状態を取得
 */
export function getSystemStatus(): SystemStatus {
  // 最新の状態を取得
  const phaseData = getPhase();
  const emergencyStopState = getEmergencyStop();

  return {
    ...systemStatus,
    phase: phaseData.phase,
    emergencyStop: emergencyStopState,
  };
}

/**
 * MT5 接続状態を更新
 */
export function updateMT5Status(status: "CONNECTED" | "DISCONNECTED"): void {
  systemStatus.mt5 = status;
}

/**
 * ZeroMQ 状態を更新
 */
export function updateZeroMQStatus(status: "OK" | "NG"): void {
  systemStatus.zeromq = status;
}

/**
 * データフィード状態を更新
 */
export function updateDataFeedStatus(status: "LIVE" | "MANUAL"): void {
  systemStatus.dataFeed = status;
}

/**
 * レイテンシを更新
 */
export function updateLatency(latencyMs: number): void {
  systemStatus.latencyMs = latencyMs;
}

export default {
  getSystemStatus,
  updateMT5Status,
  updateZeroMQStatus,
  updateDataFeedStatus,
  updateLatency,
};

