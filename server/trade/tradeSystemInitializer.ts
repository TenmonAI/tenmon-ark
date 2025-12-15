/**
 * ============================================================
 *  TRADE SYSTEM INITIALIZER — トレードシステム初期化
 * ============================================================
 * 
 * MT5 Data Receiver を初期化し、自動観測を開始
 * ============================================================
 */

import MT5DataReceiver from "./mt5DataReceiver";
import XAUUSDTradeEngine from "./xauusd/xauusdTradeEngine";

let dataReceiver: MT5DataReceiver | null = null;
let xauusdEngine: XAUUSDTradeEngine | null = null;

/**
 * トレードシステムを初期化
 */
export async function initializeTradeSystem(): Promise<void> {
  try {
    // XAUUSD Trade Engine を初期化
    xauusdEngine = new XAUUSDTradeEngine();
    xauusdEngine.setPhase("T-1"); // Phase T-1（観測）で開始

    // MT5 Data Receiver を初期化
    dataReceiver = new MT5DataReceiver("tcp://0.0.0.0:5556", xauusdEngine);

    // 観測結果のコールバックを設定（オプション）
    dataReceiver.onObservationReceived((observation) => {
      // 観測結果を処理（必要に応じて）
      console.log("[TRADE-SYSTEM] Observation received:", observation.decision);
    });

    // ZeroMQ PULL を開始
    await dataReceiver.initialize();

    console.log("[TRADE-SYSTEM] Initialized successfully");
  } catch (error) {
    console.error("[TRADE-SYSTEM] Failed to initialize:", error);
  }
}

/**
 * トレードシステムを停止
 */
export async function shutdownTradeSystem(): Promise<void> {
  if (dataReceiver) {
    await dataReceiver.close();
    dataReceiver = null;
  }
  xauusdEngine = null;
  console.log("[TRADE-SYSTEM] Shutdown complete");
}

/**
 * XAUUSD Trade Engine を取得
 */
export function getXAUUSDTradeEngine(): XAUUSDTradeEngine | null {
  return xauusdEngine;
}

export default {
  initializeTradeSystem,
  shutdownTradeSystem,
  getXAUUSDTradeEngine,
};

