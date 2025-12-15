/**
 * ============================================================
 *  MT5 DATA RECEIVER — MT5 からのデータ受信（ZeroMQ PULL）
 * ============================================================
 * 
 * MT5 から M1 確定時にローソク足データを受信
 * 
 * 送信内容（MT5側）:
 * - 最新 50 本の M1 ローソク足
 * - symbol, time, open, high, low, close, volume
 * 
 * 受信後、即 xauusdDecideFromCandles を呼び出す
 * 
 * ⚠️ この段階では注文処理は絶対に呼ばない
 * ============================================================
 */

import type { Candle } from "./types";
import XAUUSDTradeEngine from "./xauusd/xauusdTradeEngine";

/**
 * MT5 から受信するローソク足データ
 */
export interface MT5CandleData {
  symbol: string;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * MT5 Data Receiver
 * 
 * ZeroMQ PULL で MT5 からデータを受信
 */
export class MT5DataReceiver {
  private puller: any = null; // zmq.Puller
  private connected: boolean = false;
  private readonly bindAddress: string;
  private xauusdEngine: XAUUSDTradeEngine;
  private onObservation?: (observation: any) => void;

  constructor(
    bindAddress: string = "tcp://0.0.0.0:5556",
    xauusdEngine: XAUUSDTradeEngine
  ) {
    this.bindAddress = bindAddress;
    this.xauusdEngine = xauusdEngine;
  }

  /**
   * ZeroMQ PULL を初期化
   */
  async initialize(): Promise<void> {
    try {
      // ZeroMQ を動的にインポート
      const zmq = await this.importZeroMQ();
      if (!zmq) {
        console.warn("[MT5-RECEIVER] ZeroMQ not available, using mock mode");
        return;
      }

      this.puller = new zmq.Pull();
      await this.puller.bind(this.bindAddress);
      this.connected = true;
      console.log(`[MT5-RECEIVER] Puller bound to ${this.bindAddress}`);

      // 受信ループを開始
      this.startReceiveLoop();
    } catch (error) {
      console.error("[MT5-RECEIVER] Failed to initialize:", error);
      this.connected = false;
    }
  }

  /**
   * ZeroMQ を動的にインポート
   */
  private async importZeroMQ(): Promise<any> {
    try {
      // @ts-ignore - オプショナル依存
      const zmq = await import("zeromq");
      return zmq;
    } catch (error) {
      return null;
    }
  }

  /**
   * 受信ループを開始
   */
  private async startReceiveLoop(): Promise<void> {
    if (!this.connected || !this.puller) {
      return;
    }

    while (this.connected) {
      try {
        const message = await this.puller.receive();
        const data = JSON.parse(message.toString());

        // MT5 から受信したローソク足データを処理
        await this.handleMT5Data(data);
      } catch (error) {
        console.error("[MT5-RECEIVER] Failed to receive:", error);
        // エラーが発生してもループを継続
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * MT5 から受信したデータを処理
   */
  private async handleMT5Data(data: {
    symbol: string;
    candles: MT5CandleData[];
  }): Promise<void> {
    try {
      // MT5 から受信したローソク足データを Candle 型に変換
      const candles: Candle[] = data.candles.map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        range: c.high - c.low,
      }));

      // xauusdDecideFromCandles を自動呼び出し
      const observation = await this.xauusdEngine.decideFromCandles(
        data.symbol,
        candles,
        undefined, // direction は未指定（観測のみ）
        Date.now() // serverTimeUTC
      );

      // 観測結果をログ出力（STEP 2 で完全化）
      console.log("[MT5-RECEIVER] Observation:", JSON.stringify(observation, null, 2));

      // コールバックを呼び出し（オプション）
      if (this.onObservation) {
        this.onObservation(observation);
      }
    } catch (error) {
      console.error("[MT5-RECEIVER] Failed to handle MT5 data:", error);
    }
  }

  /**
   * 観測結果のコールバックを設定
   */
  onObservationReceived(callback: (observation: any) => void): void {
    this.onObservation = callback;
  }

  /**
   * 接続状態を取得
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * 接続を閉じる
   */
  async close(): Promise<void> {
    this.connected = false;
    if (this.puller) {
      try {
        await this.puller.close();
      } catch (error) {
        console.error("[MT5-RECEIVER] Failed to close:", error);
      }
    }
  }
}

export default MT5DataReceiver;

