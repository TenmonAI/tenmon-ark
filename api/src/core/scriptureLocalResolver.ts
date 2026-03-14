import { resolveScriptureFamily } from "./scriptureFamily.js";


function __tenmonNormalizeLocalTerms(input: string, family: string, terms: string[]): string[] {
  const raw = String(input || "").trim();
  let out = [...terms].map((t) => String(t || "").trim()).filter(Boolean);

  if (family === "KATAKAMUNA") {
    if (/アの解釈|「ア」|アは/u.test(raw)) out = ["ア", "空中", "五十連"];
    if (/ヒの解釈|「ヒ」|ヒは/u.test(raw)) out = ["ヒ"];
    if (/イの解釈|「イ」|イは/u.test(raw)) out = ["イ"];
  }

  if (family === "IROHA") {
    if (/水火/u.test(raw)) out = ["水火", "天地開闢", "古事記"];
    if (/イロハ|いろは/u.test(raw) && out.length === 0) out = ["いろは"];
  }

  if (family === "KUKAI") {
    if (/即身成仏義|即身成仏/u.test(raw)) out = ["即身成仏", "六大", "三密"];
    if (/声字実相義|声字実相/u.test(raw)) out = ["声字実相", "六合釈", "釈名体義"];
    if (/十住心/u.test(raw)) out = ["十住心"];
  }

  if (family === "SOUJISHO") {
    if (/相似象学会誌/u.test(raw)) out = ["相似象", "楢崎", "感受性"];
    if (/楢崎/u.test(raw)) out = ["楢崎", "相似象"];
    if (/感受性/u.test(raw)) out = ["感受性", "相似象"];
  }

  return Array.from(new Set(out.filter(Boolean)));
}

function __tenmonPrimaryDocOverride(input: string, family: string, primaryDoc: string): string {
  const raw = String(input || "").trim();
  if (family === "KUKAI" && (/即身成仏|声字実相|十住心/u.test(raw))) return "KUKAI_COLLECTION_0002";
  return primaryDoc;
}

function __tenmonFamilyDocsOverride(input: string, family: string, familyDocs: string[]): string[] {
  const raw = String(input || "").trim();
  if (family === "KUKAI" && (/即身成仏|声字実相/u.test(raw))) return ["KUKAI_COLLECTION_0002"];
  return familyDocs;
}


export type ScriptureLocalResolution = {
  family: string;
  primaryDoc: string;
  familyDocs: string[];
  queryTerms: string[];
  intent: "scripture_local_read" | "scripture_definition";
};

function clean(s: string): string {
  return String(s || "")
    .replace(/言灵/g, "言霊")
    .replace(/言靈/g, "言霊")
    .replace(/[？?。!！]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveScriptureLocalEvidence(input: string): ScriptureLocalResolution | null {
  const raw = clean(input);
  const fam = resolveScriptureFamily(raw);
  if (!fam) return null;

  const intent: "scripture_local_read" | "scripture_definition" =
    /(での|における|の読み方|の解釈|の核心|の意味)/.test(raw)
      ? "scripture_local_read"
      : "scripture_definition";

  const terms: string[] = [];

  if (/即身成仏義|即身成仏/.test(raw)) terms.push("即身成仏", "即身成仏義");
  if (/声字実相義|声字実相/.test(raw)) terms.push("声字実相", "声字実相義");
  if (/十住心論/.test(raw)) terms.push("十住心論");
  if (/秘蔵宝鑰/.test(raw)) terms.push("秘蔵宝鑰");
  if (/吽字義/.test(raw)) terms.push("吽字義");
  if (/般若心経秘鍵/.test(raw)) terms.push("般若心経秘鍵");

  if (/水火/.test(raw)) terms.push("水火");

  if (/(^|[ 　])ア([ 　]|$)|アの/.test(raw)) terms.push("ア", "アは", "「ア」");
  if (/(^|[ 　])イ([ 　]|$)|イの/.test(raw)) terms.push("イ", "イは", "「イ」");
  if (/(^|[ 　])ヒ([ 　]|$)|ヒの/.test(raw)) terms.push("ヒ", "ヒは", "「ヒ」");

  const isDefinition = /とは|とは何|とはなに/.test(raw);
  const isHistory = /歴史|系譜|起源|誰が|いつ|成立/.test(raw);
  const isLocalRead = /(での|における|の読み方|の解釈|の核心|の意味)/.test(raw);

  if (!terms.length) {
    if (fam.family === "IROHA") {
      if (isDefinition) terms.push("いろは");
      else if (isLocalRead) terms.push("水火");
      else if (isHistory) terms.push("空海", "いろは");
      else terms.push("いろは");
    } else if (fam.family === "KATAKAMUNA") {
      if (isDefinition) terms.push("カタカムナ");
      else if (isHistory) terms.push("楢崎", "カタカムナ");
      else terms.push("カタカムナ");
    } else if (fam.family === "KUKAI") {
      if (isDefinition) terms.push("空海", "声字実相");
      else if (isLocalRead) terms.push("即身成仏", "声字実相");
      else if (isHistory) terms.push("空海");
      else terms.push("空海");
    } else if (fam.family === "KHS") {
      terms.push("言霊");
    } else if (fam.family === "HOKEKYO") {
      terms.push("法華経");
    }
  }


  // KUKAI_LOCAL_DISAMBIG_V1
  if (fam.family == "KUKAI") {
    const raw = String(input || "");

    if (/即身成仏/u.test(raw)) {
    
  // KATAKAMUNA_A_LOCAL_FIX_V1
  if (fam.family == "KATAKAMUNA") {
    const raw = String(input || "");
    if (/ア/u.test(raw) && /解釈/u.test(raw)) {
      return {
        family: fam.family,
        primaryDoc: "カタカムナ言霊解",
        familyDocs: ["カタカムナ言霊解", "カタカムナ言灵解.pdf"],
        intent: "scripture_local_read",
        queryTerms: ["ア", "起こり", "初音", "図象", "水火"]
      };
    }
  }

  return {
        family: fam.family,
        primaryDoc: "KUKAI_COLLECTION_0002",
        familyDocs: ["KUKAI_COLLECTION_0002", "KUKAI_COLLECTION_0003", "KUKAI_COLLECTION_0004", "KUKAI_COLLECTION_0001"],
        intent: "scripture_local_read",
        queryTerms: ["即身成仏", "六大", "三密"]
      };
    }

    if (/声字実相/u.test(raw)) {
      return {
        family: fam.family,
        primaryDoc: "KUKAI_COLLECTION_0002",
        familyDocs: ["KUKAI_COLLECTION_0002", "KUKAI_COLLECTION_0003", "KUKAI_COLLECTION_0004", "KUKAI_COLLECTION_0001"],
        intent: "scripture_local_read",
        queryTerms: ["声字実相", "釈名体義", "六合釈", "梵語複合語"]
      };
    }
  }

  return {
    family: fam.family,
    primaryDoc: fam.primaryDoc,
    familyDocs: fam.familyDocs,
    queryTerms: Array.from(new Set(terms)).filter(Boolean),
    intent,
  };
}
