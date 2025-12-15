/**
 * ============================================================
 *  DECISION LOG — 判断ログ（READ ONLY）
 * ============================================================
 * 
 * 削除・編集不可
 * UI 側は scroll のみ
 * ============================================================
 */

export interface DecisionLogEntry {
  time: number;
  direction: "BUY" | "SELL" | "NONE";
  decision: string;
  reason: string;
}

// 判断ログ（メモリ内、実運用では DB に保存）
const decisionLogs: DecisionLogEntry[] = [];

/**
 * 判断ログを追加（内部用）
 */
export function addDecisionLog(entry: DecisionLogEntry): void {
  decisionLogs.push(entry);

  // 最新1000件のみ保持
  if (decisionLogs.length > 1000) {
    decisionLogs.shift();
  }
}

/**
 * 判断ログを取得（最新N件）
 */
export function getLatest(limit: number = 100): DecisionLogEntry[] {
  return decisionLogs.slice(-limit).reverse(); // 最新が上
}

/**
 * 判断ログをクリア（テスト用、実運用では削除不可）
 */
export function clearLogs(): void {
  decisionLogs.length = 0;
}

export default {
  addDecisionLog,
  getLatest,
  clearLogs,
};

