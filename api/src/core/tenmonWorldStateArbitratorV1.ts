import type { EpistemicLayerV1 } from "./tenmonConstitutionV3.js";

const VERIFIED_FACT_RE =
  /(\d{2,4}年|\d+月|\d+日|\d+(?:\.\d+)?%|\d+(?:\.\d+)?兆|\d+(?:\.\d+)?億|[A-Z][A-Za-z0-9_-]{1,}|[一-龯]{2,}(?:省|庁|県|市|国|社|党))/g;
const PROBABLE_RE = /(と思われる|の可能性|かもしれない|見込み)/;
const NARRATIVE_RE = /(という説|とされる|と言われる|との見方)/;
const STRATEGIC_RE = /(に注意|すべき|したほうがよい|推奨|対策)/;

function splitSentencesV1(text: string): string[] {
  return String(text)
    .split(/[。.!?？\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// 外部情報を認識層に分離
export function splitEpistemicLayerV1(
  rawInput: string,
  _sourceType: "news" | "general" | "practical" | "question"
): EpistemicLayerV1 {
  const input = String(rawInput ?? "").trim();
  const verified_fact = Array.from(new Set(input.match(VERIFIED_FACT_RE) ?? []));

  const probable_interpretation: string[] = [];
  const narrative_claim: string[] = [];
  const strategic_implication: string[] = [];

  for (const s of splitSentencesV1(input)) {
    if (PROBABLE_RE.test(s)) probable_interpretation.push(s);
    if (NARRATIVE_RE.test(s)) narrative_claim.push(s);
    if (STRATEGIC_RE.test(s)) strategic_implication.push(s);
  }

  return {
    raw_input: input,
    verified_fact,
    probable_interpretation,
    narrative_claim,
    strategic_implication,
    tenmon_verdict: "unresolved",
  };
}

// 真理構造との整合評価
export function compareTruthStructureV1(
  layer: EpistemicLayerV1,
  centerFamily: string
): { verdict: EpistemicLayerV1["tenmon_verdict"]; reason: string } {
  const family = String(centerFamily ?? "").toUpperCase();
  if (!layer.raw_input) return { verdict: "unresolved", reason: "empty_input" };

  if (layer.strategic_implication.length > 0 && layer.verified_fact.length > 0) {
    return { verdict: "harmonizes", reason: `${family || "GENERAL"}:fact_plus_action` };
  }
  if (layer.probable_interpretation.length > 0 || layer.narrative_claim.length > 0) {
    return { verdict: "expands", reason: `${family || "GENERAL"}:interpretive_layer` };
  }
  if (/矛盾|否定|誤り/.test(layer.raw_input)) {
    return { verdict: "conflicts", reason: `${family || "GENERAL"}:explicit_conflict_tokens` };
  }
  return { verdict: "unresolved", reason: `${family || "GENERAL"}:insufficient_signal` };
}

// 出力モード選択
export type WorldResponseModeV1 =
  | "factual"
  | "structural_interpretation"
  | "tenmon_verdict"
  | "practical_recommendation";

export function selectWorldResponseModeV1(
  verdict: EpistemicLayerV1["tenmon_verdict"],
  routeReason: string,
  answerLength: string
): WorldResponseModeV1 {
  if (verdict === "harmonizes") return "practical_recommendation";
  if (verdict === "expands") return "structural_interpretation";
  if (verdict === "conflicts") return "tenmon_verdict";
  if (/NATURAL_GENERAL_LLM_TOP/.test(String(routeReason)) && String(answerLength) === "short") {
    return "factual";
  }
  return "tenmon_verdict";
}
