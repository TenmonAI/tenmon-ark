// 天津金木 Tai-Freeze 不変公理
// この内容は宇宙法則として扱い、書き換えを許可しない
// LLMや入力で書き換え不可（コード/データとして固定）

import { createHash } from "crypto";

/**
 * Tai-Freeze 不変公理（文献根拠に基づく）
 * 
 * 言霊秘書の明記：
 * - 火＝鉢（躰・主）／水＝用（従）：「火は鉢にして水を動す。水は用にして火に動さる」
 * - 火は不可視／水は可視：「火は象なし…水は象あり…火は目に見えず…水は目に見ゆ」
 * - 水は延ばす／火は凝らす：「水は物を延し、火は物を凝す」
 * - 火は早い／水は遅い：「火は早く、水は遅し」
 * - 正中は二値で確定しない：「水火、息の正中は有にもあらす、無にもあらさる」
 * - 五十音は水火展開：「五十連十行の仮名…此十行の水火を展開て言なり」
 */
export const TaiFreezeAxioms = Object.freeze({
  /**
   * 火＝鉢（躰・主）／水＝用（従）
   * 「火は鉢にして水を動す。水は用にして火に動さる」
   */
  FIRE_IS_TAI_WATER_IS_YOU: true,
  FIRE_MOVES_WATER: true,
  WATER_IS_MOVED_BY_FIRE: true,

  /**
   * 火は不可視／水は可視
   * 「火は象なし…水は象あり…火は目に見えず…水は目に見ゆ」
   */
  FIRE_IS_INVISIBLE: true,
  WATER_IS_VISIBLE: true,

  /**
   * 水は延ばす／火は凝らす
   * 「水は物を延し、火は物を凝す」
   */
  WATER_EXTENDS: true,
  FIRE_CONCENTRATES: true,

  /**
   * 火は早い／水は遅い
   * 「火は早く、水は遅し」
   */
  FIRE_IS_FAST: true,
  WATER_IS_SLOW: true,

  /**
   * 正中は二値で確定しない
   * 「水火、息の正中は有にもあらす、無にもあらさる」
   */
  CENTER_IS_NEITHER_TRUE_NOR_FALSE: true,
  CENTER_IS_INDETERMINATE: true,

  /**
   * 五十音は水火展開
   * 「五十連十行の仮名…此十行の水火を展開て言なり」
   */
  GOJUON_IS_FIRE_WATER_EXPANSION: true,

  /**
   * 不変制約（実装原則）
   */
  NEVER_RESOLVE_CONTRADICTION: true,
  NEVER_DELETE_OPPOSITION: true,
  ALWAYS_KEEP_PROVISIONAL: true,
  OUTPUT_IS_OBSERVATION_NOT_ANSWER: true,
  NO_SINGLE_FACTOR_DECISION: true, // 最低2つの根拠 evidence を trace に残す
} as const);

/**
 * Tai-Freeze ハッシュ（整合性検証用）
 */
export function computeTaiFreezeHash(): string {
  const raw = Object.keys(TaiFreezeAxioms)
    .sort()
    .map(k => `${k}:${(TaiFreezeAxioms as any)[k]}`)
    .join("|");
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Tai-Freeze 整合性検証
 * 
 * 改変検知時は CRITICAL LOG を出力し、正中遷移を促す
 */
export function verifyTaiFreezeIntegrity(expectedHash?: string): {
  verified: boolean;
  reason?: string;
} {
  const currentHash = computeTaiFreezeHash();
  if (expectedHash && currentHash !== expectedHash) {
    // CRITICAL LOG（エラーではなく、思想汚染の検知）
    console.error("[TAI-FREEZE-CRITICAL] Integrity violation detected");
    console.error("[TAI-FREEZE-CRITICAL] Expected:", expectedHash);
    console.error("[TAI-FREEZE-CRITICAL] Current:", currentHash);
    console.error("[TAI-FREEZE-CRITICAL] System will transition to CENTER (WELL)");
    return {
      verified: false,
      reason: "不変核に揺らぎが検出されたため、正中で保持されている",
    };
  }
  return { verified: true };
}

/**
 * Tai-Freeze 状態取得
 */
export function getTaiFreezeStatus() {
  return {
    hash: computeTaiFreezeHash(),
    axioms: TaiFreezeAxioms,
    verified: true,
  };
}

