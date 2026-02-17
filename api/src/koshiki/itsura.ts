import type { KoshikiCell, IkiState, SpiralMode } from "./types.js";

/**
 * K2: Itsura parser (決定論)
 * - 入力テキストを1文字=1セルへ
 * - 未知文字でも落ちない（contentにそのまま入れる）
 * - 位置(row,col)は単純に1行テキスト基準（改行でrow++）
 * - iki/spiralはK2では固定（次カードで拡張）
 */
const DEFAULT_IKI: IkiState = { fire: 0, water: 0 };
const DEFAULT_SPIRAL: SpiralMode = "L_OUT";

export function parseItsura(text: string): KoshikiCell[] {
  const s = typeof text === "string" ? text : "";
  const cells: KoshikiCell[] = [];
  let row = 0;
  let col = 0;

  for (const ch of s) {
    if (ch === "\n") {
      row += 1;
      col = 0;
      continue;
    }
    cells.push({
      content: ch,
      iki: DEFAULT_IKI,
      spiral: DEFAULT_SPIRAL,
      row,
      col,
      evidenceIds: [],
    });
    col += 1;
  }
  return cells;
}
