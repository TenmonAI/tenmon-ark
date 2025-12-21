// 形マッパー

import type { FormSymbol, IkiState as LegacyIkiState, Phase, Ruleset } from "../types.js";

/**
 * 核融合炉用の形タイプ
 */
export type KanagiForm = "CIRCLE" | "LINE" | "DOT" | "WELL";

/**
 * 核融合炉用の水火状態
 */
export type FusionIkiState = {
  fire: number;  // 外発
  water: number; // 内集
};

/**
 * 核融合炉用の位相状態
 */
export type PhaseState = {
  rise: boolean;
  fall: boolean;
  open: boolean;
  close: boolean;
  center: boolean;
};

/**
 * 水火状態と位相から形をマッピング（既存API用）
 */
export function mapToForm(
  ikiState: LegacyIkiState,
  phase: Phase,
  ruleset: Ruleset
): { form: FormSymbol; confidence: number; evidence: string[] } {
  const evidence: string[] = [];
  
  // Rulesetから形マッピング規則を抽出
  const formRules = ruleset.rules.filter((rule) =>
    rule.output.includes("○") ||
    rule.output.includes("｜") ||
    rule.output.includes("ゝ") ||
    rule.output.includes("井") ||
    rule.output.includes("×") ||
    rule.output.includes("△") ||
    rule.output.includes("□") ||
    rule.output.includes("◇")
  );
  
  // パターンマッチング: {ikiState}-{phase} の組み合わせ
  const pattern = `${ikiState}-${phase}`;
  
  for (const rule of formRules) {
    if (rule.pattern.includes(pattern) || rule.pattern.includes(ikiState) || rule.pattern.includes(phase)) {
      const formMatch = rule.output.match(/(○|｜|ゝ|井|×|△|□|◇)/);
      if (formMatch) {
        const form = formMatch[1] as FormSymbol;
        evidence.push(`Form mapping: ${pattern} → ${form} (rule: ${rule.name})`);
        return { form, confidence: 0.8, evidence };
      }
    }
  }
  
  // フォールバック: デフォルトマッピング
  return mapToFormDefault(ikiState, phase);
}

/**
 * 核融合炉用の形マッピング
 * 
 * 水火の状態から幾何学的な形＝運動状態を決定する
 * 解決ではなく、運動状態を観測する
 */
export function mapToFusionForm(
  iki: FusionIkiState,
  phase: PhaseState
): KanagiForm {
  // 正中（凝・井）: 中心への圧縮
  if (phase.center) {
    return "WELL"; // 井
  }

  // 内集優勢・閉・降: 一点への収斂
  if (iki.water > iki.fire && (phase.close || phase.fall)) {
    return "DOT"; // ゝ
  }

  // 外発優勢・開・昇: 線形への貫通
  if (iki.fire > iki.water && (phase.open || phase.rise)) {
    return "LINE"; // ｜ 
  }

  // 水火拮抗・循環: 円環
  if (Math.abs(iki.fire - iki.water) <= 2) {
    return "CIRCLE"; // ○
  }

  // フォールバック（常に循環）
  return "CIRCLE";
}

/**
 * デフォルトマッピング（フォールバック）
 */
function mapToFormDefault(
  ikiState: LegacyIkiState,
  phase: Phase
): { form: FormSymbol; confidence: number; evidence: string[] } {
  const evidence: string[] = [];
  
  // デフォルトマッピングテーブル
  const mapping: Record<string, FormSymbol> = {
    "FIRE-rise": "○",
    "FIRE-fall": "｜",
    "FIRE-open": "ゝ",
    "FIRE-close": "井",
    "FIRE-center": "×",
    "WATER-rise": "△",
    "WATER-fall": "□",
    "WATER-open": "◇",
    "WATER-close": "｜",
    "WATER-center": "○",
    "BOTH-rise": "○",
    "BOTH-fall": "｜",
    "BOTH-open": "ゝ",
    "BOTH-close": "井",
    "BOTH-center": "×",
    "NEUTRAL-rise": "○",
    "NEUTRAL-fall": "｜",
    "NEUTRAL-open": "ゝ",
    "NEUTRAL-close": "井",
    "NEUTRAL-center": "×",
  };
  
  const key = `${ikiState}-${phase}`;
  const form = mapping[key] || "○";
  evidence.push(`Default mapping: ${key} → ${form}`);
  
  return { form, confidence: 0.5, evidence };
}

