import type { SpiralMotion } from "./spiral.js";

export type UfkClass = "A" | "B" | "C";

export type ClassResult = {
  ufkClass: UfkClass;
  reasonCodes: string[];
};

/**
 * 24構造律（MVP）
 * - 予言ではなく「状態分類」
 * - 決定論：同入力→同出力
 */
export function classifyPermutation(seq: SpiralMotion[]): ClassResult {
  const s = Array.isArray(seq) ? seq : [];
  const key = s.join(",");

  // 代表パターン（最小）
  if (key === "LEFT_IN,LEFT_OUT,RIGHT_IN,RIGHT_OUT") {
    return { ufkClass: "A", reasonCodes: ["CANONICAL_EXPAND"] };
  }
  if (key === "RIGHT_OUT,RIGHT_IN,LEFT_OUT,LEFT_IN") {
    return { ufkClass: "C", reasonCodes: ["CANONICAL_COLLAPSE"] };
  }
  if (s.length === 0) return { ufkClass: "B", reasonCodes: ["EMPTY_SEQ"] };

  // その他は暫定B（中間）
  return { ufkClass: "B", reasonCodes: ["OTHER_SEQ", `LEN_${s.length}`] };
}
