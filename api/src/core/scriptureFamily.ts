export type ScriptureFamilyKey = "IROHA" | "KATAKAMUNA" | "KHS" | "KUKAI" | "HOKEKYO" | "SOUJISHO";

export type ScriptureFamilyInfo = {
  family: ScriptureFamilyKey;
  primaryDoc: string;
  familyDocs: string[];
  aliases: string[];
};

const FAMILIES: Record<ScriptureFamilyKey, ScriptureFamilyInfo> = {
  IROHA: {
    family: "IROHA",
    primaryDoc: "いろは言霊解",
    familyDocs: ["いろは言霊解", "いろは最終原稿.docx", "IROHA"],
    aliases: ["いろは言霊解", "イロハ言霊解", "いろは", "イロハ", "IROHA"],
  },
  KATAKAMUNA: {
    family: "KATAKAMUNA",
    primaryDoc: "カタカムナ言灵解.pdf",
    familyDocs: ["カタカムナ言灵解.pdf", "カタカムナ言霊解", "KATAKAMUNA", "カタカムナウタヒ"],
    aliases: ["カタカムナ言霊解", "カタカムナ言灵解", "カタカムナ", "ウタヒ", "カタカムナウタヒ"],
  },
  KHS: {
    family: "KHS",
    primaryDoc: "言霊秘書.pdf",
    familyDocs: ["言霊秘書.pdf", "言霊秘書", "KHS", "NAS:PDF:KOTODAMA_HISYO:0bae39bb538f"],
    aliases: ["言霊秘書", "KHS", "五十連", "言霊一言之法則"],
  },
  KUKAI: {
    family: "KUKAI",
    primaryDoc: "KUKAI_COLLECTION_0002",
    familyDocs: [
      "KUKAI_COLLECTION_0002",
      "KUKAI_COLLECTION_0003",
      "KUKAI_COLLECTION_0001",
      "KUKAI_COLLECTION_0004",
      "空海コレクション2",
      "空海コレクション3",
      "空海コレクション1",
      "空海コレクション4"
    ],
    aliases: [
      "空海", "弘法大師",
      "即身成仏義", "即身成仏",
      "声字実相義", "声字実相",
      "十住心論", "秘蔵宝鑰", "吽字義", "般若心経秘鍵"
    ],
  },

  SOUJISHO: {
    family: "SOUJISHO",
    primaryDoc: "SOGO_1号_pdf",
    aliases: [
      "相似象学会誌",
      "相似象",
      "楢崎皐月",
      "宇野多美恵",
      "感受性",
      "感受性訓練",
      "静電三法",
      "補遺"
    ],
    familyDocs: [
      "SOGO_1号_pdf","SOGO_2号_pdf","SOGO_3号_pdf","SOGO_4号_pdf","SOGO_5号_pdf",
      "SOGO_6号_pdf","SOGO_7号_pdf","SOGO_8号_pdf","SOGO_9号_pdf","SOGO_10号_pdf",
      "SOGO_11号_pdf","SOGO_12号_pdf","SOGO_13号_pdf","SOGO_14号_pdf","SOGO_15号_pdf",
      "NARASAKI_静電三法_楢崎_皐月_1_pdf",
      "KANJUSEI_感受性1_pdf","KANJUSEI_感受性2_pdf","KANJUSEI_感受性3_pdf","KANJUSEI_感受性4_pdf",
      "HUII_補遺1_pdf","HUII_補遺2_pdf","HUII_補遺3_pdf","HUII_補遺4_pdf"
    ]
  },
  HOKEKYO: {
    family: "HOKEKYO",
    primaryDoc: "HOKKE",
    familyDocs: ["HOKKE", "LOTUS_TENMON_DHARANI21", "法華経言灵解.pdf"],
    aliases: ["法華経", "法華経言霊解", "法華経言灵解", "HOKKE", "LOTUS"],
  },
};

function norm(s: string): string {
  return String(s || "")
    .replace(/言灵/g, "言霊")
    .replace(/言靈/g, "言霊")
    .replace(/\s+/g, "")
    .trim();
}

export function detectScriptureFamilyFromText(text: string): ScriptureFamilyKey | null {
  const t = norm(text);
  for (const k of Object.keys(FAMILIES) as ScriptureFamilyKey[]) {
    const fam = FAMILIES[k];
    if (fam.aliases.some(a => t.includes(norm(a)))) return k;
  }
  return null;
}

export function resolveScriptureFamily(input: string | ScriptureFamilyKey | null | undefined): ScriptureFamilyInfo | null {
  if (!input) return null;
  const key = (input in FAMILIES ? input : detectScriptureFamilyFromText(String(input))) as ScriptureFamilyKey | null;
  return key ? FAMILIES[key] : null;
}

export function getScriptureFamilyDocs(input: string | ScriptureFamilyKey | null | undefined): string[] {
  return resolveScriptureFamily(input)?.familyDocs || [];
}

export function getScriptureFamilyPrimaryDoc(input: string | ScriptureFamilyKey | null | undefined): string | null {
  return resolveScriptureFamily(input)?.primaryDoc || null;
}
