/**
 * TENMON_A1_KOKUZO_BAD_GUARD_V1
 * kokuzo 参照（会話候補・Seed 入力）から BAD シグナル付きテキストを除外するための共通ヒューリスティック。
 * 本文の削除は行わない。参照選別のみ。
 *
 * 判定は automation/kokuzo_bad_observer_v1.py の hard_bad に揃える:
 *   replacement(U+FFFD) > 0 OR NUL > 0 OR ctrl_rate >= 0.01
 * 制御文字: TAB/LF/CR 以外の <0x20 および 0x7F–0x9F
 *
 * 将来 DB quality flag 等へ昇格しやすいよう reasons / qualityFlags を返す。
 */

export const KOKUZO_BAD_QUALITY_FLAG_V1 = {
  HARD_REPLACEMENT: "kokuzo_bad_hard_replacement_v1",
  HARD_NUL: "kokuzo_bad_hard_nul_v1",
  HARD_CTRL_RATE: "kokuzo_bad_hard_ctrl_rate_v1",
} as const;

export type KokuzoBadHeuristicResultV1 = {
  /** true のとき参照候補・Seed 入力から除外する */
  isBad: boolean;
  reasons: string[];
  qualityFlags: string[];
  ctrlRate: number;
  nulCount: number;
  replacementCount: number;
};

function isDisallowedControlChar(code: number): boolean {
  if (code === 0x09 || code === 0x0a || code === 0x0d) return false;
  if (code < 0x20) return true;
  if (code >= 0x7f && code <= 0x9f) return true;
  return false;
}

/**
 * 単一テキストに対する BAD 判定（Python analyze_text.hard_bad_signal 相当）
 */
export function evaluateKokuzoBadHeuristicV1(text: string): KokuzoBadHeuristicResultV1 {
  const s = String(text ?? "");
  const ln = s.length;
  const nulCount = ln ? (s.split("\x00").length - 1) : 0;
  let replacementCount = 0;
  let ctrl = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0xfffd) replacementCount++;
    if (isDisallowedControlChar(c)) ctrl++;
  }
  const ctrlRate = ln ? ctrl / ln : 0;

  const reasons: string[] = [];
  const qualityFlags: string[] = [];

  if (replacementCount > 0) {
    reasons.push("replacement_char");
    qualityFlags.push(KOKUZO_BAD_QUALITY_FLAG_V1.HARD_REPLACEMENT);
  }
  if (nulCount > 0) {
    reasons.push("nul_byte");
    qualityFlags.push(KOKUZO_BAD_QUALITY_FLAG_V1.HARD_NUL);
  }
  if (ctrlRate >= 0.01) {
    reasons.push("ctrl_rate");
    qualityFlags.push(KOKUZO_BAD_QUALITY_FLAG_V1.HARD_CTRL_RATE);
  }

  return {
    isBad: reasons.length > 0,
    reasons,
    qualityFlags,
    ctrlRate,
    nulCount,
    replacementCount,
  };
}

/** 候補スニペットとページ先頭を結合してプローブ用文字列を作る（上限で切る） */
export function mergeSnippetAndPageHeadForBadGuardV1(snippet: string, pageHead: string, maxLen = 8000): string {
  const a = String(snippet ?? "").replace(/\f/g, " ");
  const b = String(pageHead ?? "").replace(/\f/g, " ");
  return `${a}\n${b}`.slice(0, maxLen);
}

export function shouldExcludeKokuzoReferenceTextV1(text: string): boolean {
  return evaluateKokuzoBadHeuristicV1(text).isBad;
}
