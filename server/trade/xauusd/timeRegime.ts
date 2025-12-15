/**
 * ============================================================
 *  TIME REGIME — 時間帯レジーム定義（XAUUSD 固定）
 * ============================================================
 * 
 * XAUUSD 1分足専用の時間帯レジーム
 * 
 * 実装ルール:
 * - NO_TRADE → STATE 強制 BROKEN
 * - LOW_EXPECTANCY → Entry 90% 抑制
 * - HIGH_EXPECTANCY のみ 連続エントリー許可対象
 * ============================================================
 */

/**
 * 時間帯レジーム
 */
export type TimeRegime =
  | "HIGH_EXPECTANCY"
  | "MID_EXPECTANCY"
  | "LOW_EXPECTANCY"
  | "NO_TRADE";

/**
 * 時間帯レジームを取得
 */
export function getTimeRegime(serverTimeUTC: number): TimeRegime {
  const date = new Date(serverTimeUTC);
  const hour = date.getUTCHours();

  // ロンドン〜NY重複（最重要）
  // UTC 12:00-17:00 = ロンドン 13:00-18:00 / NY 08:00-13:00
  if (hour >= 12 && hour < 17) {
    return "HIGH_EXPECTANCY";
  }

  // ロンドン単体 / NY後半
  // UTC 07:00-12:00 = ロンドン 08:00-13:00
  // UTC 17:00-20:00 = NY 13:00-16:00
  if ((hour >= 7 && hour < 12) || (hour >= 17 && hour < 20)) {
    return "MID_EXPECTANCY";
  }

  // アジア時間
  // UTC 01:00-07:00 = アジア時間帯
  if (hour >= 1 && hour < 7) {
    return "LOW_EXPECTANCY";
  }

  // 流動性死時間（UTC 20:00-01:00）
  return "NO_TRADE";
}

/**
 * 時間帯レジームの説明を取得
 */
export function getTimeRegimeDescription(regime: TimeRegime): string {
  switch (regime) {
    case "HIGH_EXPECTANCY":
      return "ロンドン〜NY重複（最重要）";
    case "MID_EXPECTANCY":
      return "ロンドン単体 / NY後半";
    case "LOW_EXPECTANCY":
      return "アジア時間";
    case "NO_TRADE":
      return "流動性死時間";
  }
}

/**
 * エントリー抑制率を取得
 */
export function getEntrySuppressionRate(regime: TimeRegime): number {
  switch (regime) {
    case "HIGH_EXPECTANCY":
      return 0.0; // 抑制なし
    case "MID_EXPECTANCY":
      return 0.5; // 50% 抑制
    case "LOW_EXPECTANCY":
      return 0.9; // 90% 抑制
    case "NO_TRADE":
      return 1.0; // 100% 抑制（取引禁止）
  }
}

export default {
  getTimeRegime,
  getTimeRegimeDescription,
  getEntrySuppressionRate,
};

