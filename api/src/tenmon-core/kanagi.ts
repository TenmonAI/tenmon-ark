/**
 * 天津金木思考アルゴリズム（最小動作）
 *
 * まずは器＋最小動作で実装
 * 次フェーズで五十音ごとの意味辞書を増やしていく前提で拡張点を用意
 */

import type { Law } from "./principles.js";
import { Operation } from "./principles.js";

export type Token = {
  text: string;
  type: "hiragana" | "katakana" | "kanji" | "symbol" | "other";
  position: number;
};

export type AnalysisStep = {
  operation: Operation | null;
  lawId: string | null;
  description: string;
};

export type KotodamaAnalysis = {
  tokens: Token[];
  steps: AnalysisStep[];
  hints: string[]; // 該当しそうな Law の id 群
};

/**
 * 入力文から Law を示唆するヒント規則
 * いまはキーワード一致だが、将来は構文一致に拡張する前提。
 */
const LAW_HINT_RULES: Array<{
  id: string;
  pattern: RegExp;
  lawIds: string[];
  note: string;
}> = [
  {
    id: "hint-mizuho-himizu",
    pattern: /火水|火|水/u,
    lawIds: [
      "KOTODAMA-MIZUHO-P6-10-INVISIBLE-HIMIZU",
      "KOTODAMA-MIZUHO-P6-10-TAIYO-REVERSIBLE",
    ],
    note: "火水（鉢用）系の法則候補",
  },
  {
    id: "hint-genesis-chain",
    pattern: /凝|母胎|息|音|五十|形仮名|五十連|十行/u,
    lawIds: [
      "KOTODAMA-MIZUHO-P6-10-GENESIS-CHAIN",
      "KOTODAMA-CORE-IKI-AND-KOTO",
    ],
    note: "生成鎖（凝→息→音→形仮名→五十連）",
  },
  {
    id: "hint-futomani-symbols",
    pattern: /0|ヽ|御中主|天之御中主|ミナカ|ヌシ|ムスビ/u,
    lawIds: [
      "KOTODAMA-FUTOMANI-P13-0-AND-NO",
      "KOTODAMA-FUTOMANI-P13-AME-IS-ROTATION",
    ],
    note: "布斗麻通御霊図・御中主の法則候補",
  },
];

/**
 * 日本語テキストをトークン化
 * ひらがな/カタカナ/漢字/記号を分ける（形態素解析は後回しでOK）
 *
 * 0 と ヽ は布斗麻通御霊図で重要な記号なので symbol として必ず保持する。
 */
export function tokenizeJapanese(text: string): Token[] {
  const tokens: Token[] = [];
  let position = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);

    let type: Token["type"] = "other";

    // ひらがな（0x3040-0x309F）
    if (code >= 0x3040 && code <= 0x309f) {
      type = "hiragana";
    }
    // カタカナ（0x30A0-0x30FF）
    else if (code >= 0x30a0 && code <= 0x30ff) {
      type = "katakana";
    }
    // 漢字（0x4E00-0x9FAF）
    else if (code >= 0x4e00 && code <= 0x9faf) {
      type = "kanji";
    }
    // 記号・句読点など（0 / ヽ もここに含めて symbol として扱う）
    else if (
      (code >= 0x3000 && code <= 0x303f) || // CJK記号・句読点
      (code >= 0xff00 && code <= 0xffef) || // 全角記号
      (code >= 0x0020 && code <= 0x007e)    // ASCII記号
    ) {
      type = "symbol";
    }

    tokens.push({
      text: char,
      type,
      position,
    });

    position++;
  }

  return tokens;
}

/**
 * 言霊解析（最小実装）
 * 
 * 入力→トークン化→（該当法則の候補を列挙）→操作候補（省/延開/反約…）を提示
 */
export function analyzeKotodama(text: string): KotodamaAnalysis {
  const tokens = tokenizeJapanese(text);
  const steps: AnalysisStep[] = [];
  const hints: string[] = [];

  // 不変の思考手順（骨組み）を最初に明示
  steps.push({
    operation: null,
    lawId: null,
    description:
      "解析手順: 1) 根拠ページ／法則候補を列挙し、2) 操作候補（省・延開・反約…）を提示し、3) 火水・五十連・御中主・カタカムナ等との整合を確認する。",
  });

  // トークン化のステップ
  steps.push({
    operation: null,
    lawId: null,
    description: `テキストを${tokens.length}個のトークンに分割しました`,
  });

  // ひらがな/カタカナの検出
  const hiraganaCount = tokens.filter((t) => t.type === "hiragana").length;
  const katakanaCount = tokens.filter((t) => t.type === "katakana").length;
  const kanjiCount = tokens.filter((t) => t.type === "kanji").length;

  if (hiraganaCount > 0) {
    steps.push({
      operation: null,
      lawId: null,
      description: `ひらがな${hiraganaCount}文字を検出`,
    });
  }

  if (katakanaCount > 0) {
    steps.push({
      operation: null,
      lawId: null,
      description: `カタカナ${katakanaCount}文字を検出`,
    });
  }

  if (kanjiCount > 0) {
    steps.push({
      operation: null,
      lawId: null,
      description: `漢字${kanjiCount}文字を検出`,
    });
    // 漢字がある場合、体用の法則をヒントに追加
    hints.push("KOTODAMA-TAIYOU");
  }

  // 佐言（起言・補言・助言）の検出
  const helperWords = ["アイ", "ウ", "オ", "シ", "ミ", "ツ", "ラ", "リ", "ル", "レ"];
  const foundHelpers = helperWords.filter((hw) => text.includes(hw));
  
  if (foundHelpers.length > 0) {
    steps.push({
      operation: null,
      lawId: "KOTODAMA-P069-HELPERS",
      description: `佐言を検出: ${foundHelpers.join(", ")}`,
    });
    hints.push("KOTODAMA-P069-HELPERS");
  }

  // 操作候補の提示（最小実装：常に基本操作を提示）
  steps.push({
    operation: "省",
    lawId: "KOTODAMA-OPERATION-BASE",
    description: "操作候補: 省・延開・反約・反・約・略・転",
  });
  hints.push("KOTODAMA-OPERATION-BASE");

  // Law ヒント規則の適用
  for (const rule of LAW_HINT_RULES) {
    if (rule.pattern.test(text)) {
      steps.push({
        operation: null,
        lawId: rule.lawIds[0] || null,
        description: `法則ヒント: ${rule.id} → 候補 ${rule.lawIds.join(", ")}（${rule.note}）`,
      });
      for (const id of rule.lawIds) {
        if (!hints.includes(id)) {
          hints.push(id);
        }
      }
    }
  }

  // 整合チェックの簡易ログ（どの軸に繋がりそうか）
  const axes: string[] = [];
  if (hints.some((id) => id.startsWith("KOTODAMA-MIZUHO-") || id === "KOTODAMA-CORE-TAIYOU-RELATIVE")) {
    axes.push("火水（体用・水穂伝附言）");
  }
  if (hints.some((id) => id.startsWith("KOTODAMA-FUTOMANI-") || id === "KOTODAMA-CORE-KOTODAMA-PROCESS")) {
    axes.push("御中主・生成鎖（布斗麻通御霊図／一言の法則）");
  }
  if (hints.includes("KOTODAMA-KAMIYO-NANAYO-FORMLESS-IKI")) {
    axes.push("神世七代（形なきいき＝隠身）");
  }

  if (axes.length > 0) {
    steps.push({
      operation: null,
      lawId: null,
      description: `整合軸の候補: ${axes.join(" / ")}`,
    });
  }

  return {
    tokens,
    steps,
    hints,
  };
}

