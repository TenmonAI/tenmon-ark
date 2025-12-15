/**
 * ============================================================
 *  MT5 ZEROMQ BRIDGE — VPS連携ブリッジ
 * ============================================================
 * 
 * ZeroMQ Publisher で MT5 Execution Agent に命令を送信
 * 
 * 安全設計:
 * - 通信断 → MT5 は新規注文不可
 * - STATE_BROKEN → 即 STOP
 * - LOCK中 → 解除条件まで一切入らない
 * ============================================================
 */

import type { Decision, MT5Command } from "./types";

/**
 * MT5 ZeroMQ Bridge
 * 
 * ZeroMQ Publisher で MT5 Execution Agent に命令を送信
 */
export class MT5ZeroMQBridge {
  private publisher: any = null; // zmq.Publisher
  private connected: boolean = false;
  private readonly bindAddress: string;

  constructor(bindAddress: string = "tcp://0.0.0.0:5555") {
    this.bindAddress = bindAddress;
  }

  /**
   * ZeroMQ Publisher を初期化
   */
  async initialize(): Promise<void> {
    try {
      // ZeroMQ を動的にインポート（オプショナル依存）
      const zmq = await this.importZeroMQ();
      if (!zmq) {
        console.warn("[MT5-ZMQ] ZeroMQ not available, using mock mode");
        return;
      }

      this.publisher = new zmq.Publisher();
      await this.publisher.bind(this.bindAddress);
      this.connected = true;
      console.log(`[MT5-ZMQ] Publisher bound to ${this.bindAddress}`);
    } catch (error) {
      console.error("[MT5-ZMQ] Failed to initialize:", error);
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
   * 命令を送信
   */
  async sendCommand(cmd: MT5Command): Promise<void> {
    if (!this.connected) {
      console.warn("[MT5-ZMQ] Not connected, command not sent:", cmd);
      return;
    }

    try {
      const message = JSON.stringify(cmd);
      await this.publisher.send(message);
      console.log(`[MT5-ZMQ] Command sent: ${cmd.type}`, cmd);
    } catch (error) {
      console.error("[MT5-ZMQ] Failed to send command:", error);
      this.connected = false;
    }
  }

  /**
   * STOP 命令を送信（緊急停止）
   */
  async sendStop(symbol: string): Promise<void> {
    await this.sendCommand({
      type: "STOP",
      symbol,
      timestamp: Date.now(),
    });
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
    if (this.publisher) {
      try {
        await this.publisher.close();
      } catch (error) {
        console.error("[MT5-ZMQ] Failed to close:", error);
      }
    }
    this.connected = false;
  }
}

export default MT5ZeroMQBridge;

