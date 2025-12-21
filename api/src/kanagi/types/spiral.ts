// 天津金木・螺旋再帰型定義
// Lv5（円融無碍）: 観測円を次回思考の FACT に再注入する

/**
 * 天津金木 螺旋再帰構造
 * 
 * 観測円を次の思考の事実へ戻すための媒体
 * 
 * 禁止事項:
 * - observation を要約しない
 * - 結論を生成しない
 * - LLM に躰や螺旋制御を任せない
 */
export interface KanagiSpiral {
  /**
   * 直前の観測円（そのまま保持）
   */
  previousObservation: string;

  /**
   * 次の FACT（解釈せず、そのまま渡す）
   * 過去の観測円は、次の瞬間の「動かぬ事実（躰の一部）」となる
   */
  nextFactSeed: string;

  /**
   * 螺旋段数（位相の高さ）
   * 各思考サイクルごとにインクリメントされる
   */
  depth: number;
}

