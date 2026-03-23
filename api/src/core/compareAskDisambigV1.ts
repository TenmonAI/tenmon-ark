/**
 * TENMON_CONVERSATION_DEFINE_CANON_PACK_B_V1
 * 二項比較を compare 面へ寄せる（魂専用の soulDefineDisambig とは別系統の汎用判定）
 */

export function compareAskHasDocOrCmdV1(raw: string): boolean {
  const t = String(raw ?? "").trim();
  return (
    /\bdoc\b/i.test(t) ||
    /pdfPage\s*=\s*\d+/i.test(t) ||
    /#詳細/.test(t) ||
    t.startsWith("#") ||
    t.startsWith("/")
  );
}

/** AとBの違い / XとYはどう違う / 違いは？ 等 */
export function isTenmonBinaryCompareQuestionV1(raw: string): boolean {
  const t0 = String(raw ?? "").trim();
  if (!t0 || compareAskHasDocOrCmdV1(t0)) return false;
  const c = t0.replace(/\u3000/g, " ").replace(/\s+/gu, " ").trim();
  if (
    /と.{1,40}?(の)?(違い|ちがい)/u.test(c) ||
    /と.{1,32}?はどう違う/u.test(c) ||
    /と.{1,32}?どう違う/u.test(c) ||
    /(違いは|どう違う|何が違う|比較して)/u.test(c)
  ) {
    return true;
  }
  return false;
}
