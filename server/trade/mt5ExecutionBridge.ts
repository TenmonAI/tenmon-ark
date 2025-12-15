/**
 * ============================================================
 *  MT5 EXECUTION BRIDGE — MT5実行ブリッジ
 * ============================================================
 * 
 * 制約:
 * - 命令受信のみ（取引命令は送らない）
 * - フェーズ T-1: 観測のみ
 * 
 * フェーズ T-1: 観測のみ（取引命令は送らない）
 * ============================================================
 */

/**
 * MT5 命令タイプ
 */
export type MT5CommandType =
  | "MARKET_DATA"
  | "POSITION_STATUS"
  | "ORDER_STATUS"
  | "ACCOUNT_STATUS";

/**
 * MT5 命令（受信のみ）
 */
export interface MT5Command {
  type: MT5CommandType;
  data: Record<string, any>;
  timestamp: number;
  source: "MT5";
}

/**
 * MT5 Execution Bridge
 * 
 * 命令受信のみ（取引命令は送らない）
 */
export class MT5ExecutionBridge {
  private commandHistory: MT5Command[] = [];
  private readonly maxHistorySize = 1000;
  private listeners: Array<(command: MT5Command) => void> = [];

  /**
   * 命令を受信（観測のみ）
   */
  receiveCommand(command: MT5Command): void {
    // 命令を記録
    this.commandHistory.push(command);
    if (this.commandHistory.length > this.maxHistorySize) {
      this.commandHistory.shift();
    }

    // リスナーに通知
    for (const listener of this.listeners) {
      listener(command);
    }
  }

  /**
   * 命令リスナーを登録
   */
  onCommand(listener: (command: MT5Command) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 命令履歴を取得
   */
  getCommandHistory(type?: MT5CommandType): MT5Command[] {
    if (type) {
      return this.commandHistory.filter((c) => c.type === type);
    }
    return [...this.commandHistory];
  }

  /**
   * 命令履歴をクリア
   */
  clearHistory(): void {
    this.commandHistory = [];
  }

  /**
   * 取引命令を送信（フェーズ T-1 では禁止）
   */
  // フェーズ T-1 では実装しない
  // sendTradeCommand(): void {
  //   throw new Error("Phase T-1: Trade commands are not allowed");
  // }
}

export default MT5ExecutionBridge;

