// 言靈マッパー

import type { FormSymbol, KotodamaRow, Role, Ruleset } from "../types.js";

/**
 * 形と位から言靈行をマッピング
 */
export function mapToKotodama(
  form: FormSymbol,
  role: Role,
  ruleset: Ruleset
): { row: KotodamaRow; confidence: number; evidence: string[] } {
  const evidence: string[] = [];
  
  // Rulesetから言靈マッピング規則を抽出
  const kotodamaRules = ruleset.rules.filter((rule) =>
    rule.output.includes("ア") ||
    rule.output.includes("ワ") ||
    rule.output.includes("ヤ") ||
    rule.output.includes("マ") ||
    rule.output.includes("ハ") ||
    rule.output.includes("ナ") ||
    rule.output.includes("タ") ||
    rule.output.includes("サ") ||
    rule.output.includes("カ") ||
    rule.output.includes("ラ")
  );
  
  // パターンマッチング: {form}-{role} の組み合わせ
  const pattern = `${form}-${role}`;
  
  for (const rule of kotodamaRules) {
    if (rule.pattern.includes(pattern) || rule.pattern.includes(form) || rule.pattern.includes(role)) {
      const rowMatch = rule.output.match(/(ア|ワ|ヤ|マ|ハ|ナ|タ|サ|カ|ラ)/);
      if (rowMatch) {
        const row = rowMatch[1] as KotodamaRow;
        evidence.push(`Kotodama mapping: ${pattern} → ${row} (rule: ${rule.name})`);
        return { row, confidence: 0.8, evidence };
      }
    }
  }
  
  // フォールバック: デフォルトマッピング
  return mapToKotodamaDefault(form, role);
}

/**
 * デフォルトマッピング（フォールバック）
 * 
 * システム規則:
 * - ア/ワ/ヤ = 君位
 * - その他 = 臣位
 */
function mapToKotodamaDefault(
  form: FormSymbol,
  role: Role
): { row: KotodamaRow; confidence: number; evidence: string[] } {
  const evidence: string[] = [];
  
  // デフォルトマッピングテーブル
  const mapping: Record<string, KotodamaRow> = {
    "○-君位": "ア",
    "○-臣位": "マ",
    "○-民位": "ハ",
    "｜-君位": "ワ",
    "｜-臣位": "ナ",
    "｜-民位": "タ",
    "ゝ-君位": "ヤ",
    "ゝ-臣位": "サ",
    "ゝ-民位": "カ",
    "井-君位": "ア",
    "井-臣位": "ラ",
    "井-民位": "マ",
    "×-君位": "ワ",
    "×-臣位": "ハ",
    "×-民位": "ナ",
    "△-君位": "ヤ",
    "△-臣位": "タ",
    "△-民位": "サ",
    "□-君位": "ア",
    "□-臣位": "カ",
    "□-民位": "ラ",
    "◇-君位": "ワ",
    "◇-臣位": "マ",
    "◇-民位": "ハ",
  };
  
  const key = `${form}-${role}`;
  const row = mapping[key] || "ア";
  evidence.push(`Default mapping: ${key} → ${row}`);
  
  return { row, confidence: 0.5, evidence };
}

/**
 * 位を決定（簡易実装）
 */
export function determineRole(form: FormSymbol, ruleset: Ruleset): Role {
  // Rulesetから位決定規則を抽出
  const roleRules = ruleset.rules.filter((rule) =>
    rule.output.includes("君位") || rule.output.includes("臣位") || rule.output.includes("民位")
  );
  
  for (const rule of roleRules) {
    if (rule.pattern.includes(form)) {
      if (rule.output.includes("君位")) {
        return "君位";
      } else if (rule.output.includes("臣位")) {
        return "臣位";
      } else if (rule.output.includes("民位")) {
        return "民位";
      }
    }
  }
  
  // デフォルト: 君位
  return "君位";
}

