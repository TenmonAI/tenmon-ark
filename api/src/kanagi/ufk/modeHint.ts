export type ModeHint = "BLACKHOLE_IN" | "WHITEHOLE_OUT" | null;

/**
 * 決定論：テキストに含まれる「ィ/ェ」または「イ/エ」で modeHint を返す（MVP）
 * - 本文は変えない。debug 用のみ。
 */
export function detectModeHint(text: string): ModeHint {
  const t = (text ?? "");
  if (t.includes("ィ") || t.includes("イ")) return "BLACKHOLE_IN";
  if (t.includes("ェ") || t.includes("エ")) return "WHITEHOLE_OUT";
  return null;
}
