// api/src/persona/laneChoice.ts
// 選択テキストを1/2/3に正規化する関数

export type LaneChoice = "LANE_1" | "LANE_2" | "LANE_3" | null;

/**
 * ユーザーの選択テキストを正規化してLANEを返す
 * @param message ユーザーの入力（"1", "①", "1)", "言灵/カタカムナ/天津金木の質問", "言灵", "資料指定", "状況整理" など）
 * @returns LANE_1, LANE_2, LANE_3, または null（選択として認識できない場合）
 */
export function parseLaneChoice(message: string): LaneChoice {
  const t = String(message || "").trim();
  
  // 数字パターン（"1", "①", "1)", "1." など）
  if (/^[1１①]/.test(t) || /^1[).。、]/.test(t)) {
    return "LANE_1";
  }
  if (/^[2２②]/.test(t) || /^2[).。、]/.test(t)) {
    return "LANE_2";
  }
  if (/^[3３③]/.test(t) || /^3[).。、]/.test(t)) {
    return "LANE_3";
  }
  
  // キーワードパターン（LANE_1: 言灵/カタカムナ/天津金木）
  if (
    /言灵|カタカムナ|天津金木|kotodama|kotodama/i.test(t) ||
    /言霊|ことだま/i.test(t)
  ) {
    return "LANE_1";
  }
  
  // キーワードパターン（LANE_2: 資料指定/doc/pdfPage）
  if (
    /資料指定|doc|pdfPage|pdf|document/i.test(t) ||
    /厳密|資料/i.test(t)
  ) {
    return "LANE_2";
  }
  
  // キーワードパターン（LANE_3: 状況整理）
  if (
    /状況整理|何を作りたい|作りたい|状況/i.test(t) ||
    /整理|整理したい/i.test(t)
  ) {
    return "LANE_3";
  }
  
  return null;
}
