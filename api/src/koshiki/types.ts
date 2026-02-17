/**
 * KOSHIKI K0 (DBなし): 型の土台だけを追加
 * - 本文生成・既存ロジックには接続しない（次カードで接続）
 */

export type SpiralMode = "L_OUT" | "R_IN" | "L_IN" | "R_OUT";

export interface IkiState {
  fire: number;  // 火
  water: number; // 水
}

/** 単位セル（将来：kana/teniwha/配置へ拡張） */
export interface KoshikiCell {
  content: string;
  iki: IkiState;
  spiral: SpiralMode;
  row: number;
  col: number;
  evidenceIds: string[]; // 捏造防止：根拠IDは必ず配列（空OK）
}

/** K0: 接続前なので、ユーティリティだけ */
export const KOSHIKI_K0 = {
  version: "K0",
} as const;
