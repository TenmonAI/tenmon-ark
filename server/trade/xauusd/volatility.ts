/**
 * ============================================================
 *  VOLATILITY — ボラティリティ閾値（1分足）
 * ============================================================
 * 
 * XAUUSD 1分足専用のボラティリティパラメータ
 * 
 * ルール:
 * - VOL_DEAD / VOL_DANGEROUS → 即 STOP
 * - VOL_WEAK → Entry Saturation Guard を即時有効
 * - VOL_IDEAL → 最優先稼働ゾーン
 * ============================================================
 */

/**
 * ボラティリティパラメータ
 */
export const VOL_PARAMS = {
  ATR_PERIOD: 14,
  MIN_ATR: 0.18, // これ以下は"死んだ相場"
  IDEAL_ATR_LOW: 0.25,
  IDEAL_ATR_HIGH: 0.55,
  MAX_ATR: 1.20, // これ以上は"危険相場"
};

/**
 * ボラティリティクラス
 */
export type VolatilityClass =
  | "VOL_DEAD"
  | "VOL_WEAK"
  | "VOL_IDEAL"
  | "VOL_STRONG"
  | "VOL_DANGEROUS";

/**
 * ボラティリティを分類
 */
export function classifyVolatility(atr: number): VolatilityClass {
  // 状態遷移テーブル（IF文禁止）
  const volTable: Array<{
    condition: (atr: number) => boolean;
    class: VolatilityClass;
  }> = [
    {
      condition: (atr) => atr < VOL_PARAMS.MIN_ATR,
      class: "VOL_DEAD",
    },
    {
      condition: (atr) => atr < VOL_PARAMS.IDEAL_ATR_LOW,
      class: "VOL_WEAK",
    },
    {
      condition: (atr) => atr <= VOL_PARAMS.IDEAL_ATR_HIGH,
      class: "VOL_IDEAL",
    },
    {
      condition: (atr) => atr <= VOL_PARAMS.MAX_ATR,
      class: "VOL_STRONG",
    },
    {
      condition: () => true,
      class: "VOL_DANGEROUS",
    },
  ];

  const volClass = volTable.find((v) => v.condition(atr))?.class || "VOL_DANGEROUS";

  return volClass;
}

/**
 * ATR を計算（簡易版）
 */
export function calculateATR(
  candles: Array<{ high: number; low: number; close: number }>,
  period: number = VOL_PARAMS.ATR_PERIOD
): number {
  if (candles.length < period + 1) {
    return 0;
  }

  const trueRanges: number[] = [];

  for (let i = candles.length - period; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];

    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );

    trueRanges.push(tr);
  }

  const atr = trueRanges.reduce((sum, tr) => sum + tr, 0) / period;

  return atr;
}

/**
 * ボラティリティクラスの説明を取得
 */
export function getVolatilityClassDescription(volClass: VolatilityClass): string {
  switch (volClass) {
    case "VOL_DEAD":
      return "死んだ相場（取引禁止）";
    case "VOL_WEAK":
      return "弱い相場（Entry Saturation Guard 有効）";
    case "VOL_IDEAL":
      return "理想的な相場（最優先稼働ゾーン）";
    case "VOL_STRONG":
      return "強い相場";
    case "VOL_DANGEROUS":
      return "危険相場（取引禁止）";
  }
}

export default {
  VOL_PARAMS,
  classifyVolatility,
  calculateATR,
  getVolatilityClassDescription,
};

