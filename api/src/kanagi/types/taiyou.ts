// 天津金木・躰用（Tai-You）型定義

/**
 * 躰（Tai）: 不変の原理・法則
 * 生成されるものではなく、参照されるもの。
 * 
 * 実装の掟: 動的に生成（new）したり、ユーザー入力によって書き換えてはならない。
 * それは常に const または readonly である。
 */
export type TaiPrinciple = {
  id: string;
  source: "KOTODAMA" | "KOJIKI" | "KATAKAMUNA" | "UNIVERSAL_LAW" | "TENMON_KANAGI";
  content: string; // 例: "火は水を動かす"
  immutable: true; // 書き換え不可
};

/**
 * 用（You）: 可変の現象・観測データ
 * 循環し、再編成されるもの。
 */
export type YouPhenomenon = {
  rawInput: string;
  observedElements: string[]; // 観測された要素
  context: string;
};

/**
 * 躰用照合結果 (The Judgment)
 * 出力は必ずこの形式に従う。
 * 
 * 実装の掟:
 * - provisional は常に true で固定（真理は定まった瞬間に死ぬため）
 * - judgment には "I think" や "I feel"（AIの感想）を含めてはならない
 * - 主語は常に「原理（Tai）」である
 */
export interface TaiYouResult {
  // 照合に用いた原理（不動）
  tai: TaiPrinciple | "UNKNOWN_PRINCIPLE";

  // 観測された現象（流動）
  you: string[];

  // 躰に照らした結果（正中からの判定）
  judgment: string;

  // 真理は常に深まるため、常に暫定である
  provisional: true;
}

