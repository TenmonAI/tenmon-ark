/**
 * 不変核：言霊の操作・分類・辞・音解釈の原理
 * 
 * 法則（Law）を型で定義し、初期法則セットを const 配列で保持
 */

export type Operation = 
  | "省"      // 省略
  | "延開"    // 延開
  | "反約"    // 反約
  | "反"      // 反
  | "約"      // 約
  | "略"      // 略
  | "転";     // 転

export type Law = {
  id: string;                    // 例: "KOTODAMA-P069-HELPERS"
  title: string;                 // 法則のタイトル
  quote: string;                 // 原文（OCR崩れがあってもそのまま保持）
  normalized: string;            // 現代語の意味を短く
  tags: string[];                // 例: ["operation","helpers","grammar"]
  source: {
    doc: string;                 // 例: "言霊秘書.pdf"
    page: number;                 // ページ番号
    note?: string;                // 補足
  };
};

/**
 * HelperWords（佐言）の定義
 */
export const HELPER_WORDS = {
  起言: ["アイ", "ウ", "オ"],      // 4（アイウオ）
  補言: ["シ", "ミ", "ツ"],        // 3（シミツ）
  助言: ["ラ", "リ", "ル", "レ"],  // 4（ラリルレ）
} as const;

/**
 * 五十連十行の「行の役割」
 */
export const GOJUON_ROWS = {
  ア行: { role: "天", description: "天" },
  ヮ行: { role: "地", description: "地" },
  ヤ行: { role: "人", description: "人（君位）" },
  カ行: { role: "臣", description: "語の活用をなす" },
  サ行: { role: "臣", description: "語の活用をなす" },
  タ行: { role: "臣", description: "語の活用をなす" },
  ナ行: { role: "臣", description: "語の活用をなす" },
  ハ行: { role: "臣", description: "語の活用をなす" },
  マ行: { role: "臣", description: "語の活用をなす" },
} as const;

/**
 * 初期法則セット
 */
export const LAWS: Law[] = [
  {
    id: "KOTODAMA-P069-HELPERS",
    title: "佐言（起言・補言・助言）",
    quote: "起言アイウオ四、補言シミツ三、助言ラリルレ四、合計十一（佐言）",
    normalized: "起言はアイウオの4つ、補言はシミツの3つ、助言はラリルレの4つ、合計11が佐言",
    tags: ["helpers", "grammar", "operation"],
    source: {
      doc: "言霊秘書.pdf",
      page: 69,
      note: "佐言の定義",
    },
  },
  {
    id: "KOTODAMA-OPERATION-BASE",
    title: "言霊の操作",
    quote: "省・延開・反約・反・約・略・転",
    normalized: "言霊の操作には省・延開・反約・反・約・略・転がある",
    tags: ["operation", "base"],
    source: {
      doc: "言霊秘書.pdf",
      page: 1,
    },
  },
  {
    id: "KOTODAMA-TENIWOHA",
    title: "辞（テニヲハ）",
    quote: "二〜五言で語と詞を綴り始終を結ぶ",
    normalized: "辞（テニヲハ）は2〜5言で語と詞を綴り、始終を結ぶ",
    tags: ["teniwoha", "grammar"],
    source: {
      doc: "言霊秘書.pdf",
      page: 1,
    },
  },
  {
    id: "KOTODAMA-TAIYOU",
    title: "体用",
    quote: "体用の関係",
    normalized: "体（躰）と用の関係",
    tags: ["taiyou", "structure"],
    source: {
      doc: "言霊秘書.pdf",
      page: 1,
    },
  },
  {
    id: "KOTODAMA-MITAMA-KOTO",
    title: "御霊と言",
    quote: "御霊と言の関係",
    normalized: "御霊（みたま）と言（こと）の関係",
    tags: ["mitama", "koto", "structure"],
    source: {
      doc: "言霊秘書.pdf",
      page: 1,
    },
  },
  {
    id: "KOTODAMA-KOTO-TAMA",
    title: "詞と霊",
    quote: "詞と霊の関係",
    normalized: "詞（こと）と霊（たま）の関係",
    tags: ["koto", "tama", "structure"],
    source: {
      doc: "言霊秘書.pdf",
      page: 1,
    },
  },
  {
    id: "KOTODAMA-REIGO",
    title: "霊合（反しなるものは同義）",
    quote: "反しなるものは同義",
    normalized: "反しなるものは同義（霊合）",
    tags: ["reigo", "operation", "meaning"],
    source: {
      doc: "言霊秘書.pdf",
      page: 1,
    },
  },
];

/**
 * 操作（Operation）の説明
 */
export const OPERATION_DESCRIPTIONS: Record<Operation, string> = {
  省: "省略する",
  延開: "延開する",
  反約: "反約する",
  反: "反する",
  約: "約する",
  略: "略する",
  転: "転じる",
};

/**
 * IDで法則を取得
 */
export function getLawById(id: string): Law | undefined {
  return LAWS.find((law) => law.id === id);
}

/**
 * タグで法則を検索
 */
export function getLawsByTag(tag: string): Law[] {
  return LAWS.filter((law) => law.tags.includes(tag));
}

/**
 * すべての法則を取得
 */
export function getAllLaws(): Law[] {
  return LAWS;
}

