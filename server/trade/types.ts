/**
 * ============================================================
 *  TENMON-TRADE TYPES — 型定義
 * ============================================================
 */

/**
 * ローソク足
 */
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  range: number; // high - low
}

/**
 * 市場状態
 */
export type MarketState = "STATE_VALID" | "STATE_WEAK" | "STATE_BROKEN";

/**
 * 損失品質
 */
export type LossQuality = "HEALTHY" | "DANGEROUS";

/**
 * エントリー方向
 */
export type EntryDirection = "BUY" | "SELL";

/**
 * 決定（Phase T-1/T-2/T-3）
 */
export type Decision =
  | "WAIT"
  | "LOCK"
  | "ALLOW"
  | "PROPOSE_BUY"
  | "PROPOSE_SELL"
  | "EXECUTE_BUY"
  | "EXECUTE_SELL"
  | "STOP";

/**
 * フェーズ
 */
export type TradePhase = "T-1" | "T-2" | "T-3";

/**
 * エントリー履歴
 */
export interface EntryHistory {
  symbol: string;
  price: number;
  direction: EntryDirection;
  timestamp: number;
}

/**
 * 飽和状態
 */
export interface SaturationState {
  locked: boolean;
  reason?: string;
  count?: number;
  threshold?: number;
}

/**
 * 決定コンテキスト
 */
export interface DecisionContext {
  market: MarketState;
  saturation: SaturationState;
  loss: LossQuality;
  phase: TradePhase;
  direction?: EntryDirection;
  auto?: boolean; // Phase T-3 のみ true
  rejectConfirmed?: boolean; // Phase T-2 で人間が拒否した場合 false
}

/**
 * MT5 命令
 */
export interface MT5Command {
  type: Decision;
  symbol: string;
  price?: number;
  volume?: number;
  direction?: EntryDirection;
  timestamp: number;
}

