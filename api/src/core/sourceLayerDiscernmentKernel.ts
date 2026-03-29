/**
 * TENMON_DISCERNMENT_PARENT: ソース層の区別（routeReason は変更しない）
 */

import { katakamunaRawTouchesAuditedSecondaryCorpusV1 } from "./katakamunaSourceAuditClassificationV1.js";
import type { TruthLayerArbitrationResultV1 } from "./meaningArbitrationKernel.js";
import type { InputSemanticSplitResultV1 } from "./inputSemanticSplitter.js";

export type SourceLayerModeV1 =
  | "historical_fact"
  | "lineage_discernment"
  | "structural_mapping"
  | "tenmon_reintegration"
  | "speculative_analogy";

/** projector へ渡す短い制約ラベル（本文全面置換はしない） */
export type SafeAnswerConstraintV1 =
  | "treat_as_historical"
  | "treat_as_lineage_discernment"
  | "treat_as_structural_mapping"
  | "treat_as_speculative_only"
  | "treat_as_tenmon_reintegration";

export type SourceLayerDiscernmentV1 = {
  schema: "TENMON_SOURCE_LAYER_DISCERNMENT_V1";
  sourceMode: SourceLayerModeV1;
  riskFlags: readonly string[];
  discernmentReason: string;
  safeAnswerConstraint: SafeAnswerConstraintV1;
};

const RE_HISTORICAL =
  /語源|史実|由来|いつ|いつ頃|誰が|誰によって|文献|史料|年代|成立|考証|サンスクリット|梵|転写|確定した|歴史上/u;
const RE_LINEAGE =
  /系譜|流れ|変貌|後世|近代以降|解釈の推移|伝承|変遷|編纂|層累|偽書|真偽/u;
const RE_STRUCTURAL = /構造|写像|対応づけ|対応付け|法則|モデル|位相|格子|マッピング/u;
const RE_TENMON_REINT = /天聞として|天聞で|再統合|統合して読む|統合の仕方|TENMON[-_]?ARK/u;
const RE_SPECULATIVE =
  /重なるのでは|重なる|同じでは|本当は|実は.{0,12}では|ノア|方舟|洪水|メタファ|類比|たとえ|同型|相似/u;

export type SourceLayerDiscernmentInputV1 = {
  split: InputSemanticSplitResultV1;
  truthLayerArbitrationV1: TruthLayerArbitrationResultV1 | null;
  rawMessage: string;
};

export function discernSourceLayerV1(input: SourceLayerDiscernmentInputV1): SourceLayerDiscernmentV1 {
  const raw = String(input.rawMessage || "").trim();
  const split = input.split;
  const truth = input.truthLayerArbitrationV1;
  const riskFlags: string[] = [];

  const h = RE_HISTORICAL.test(raw);
  const l = RE_LINEAGE.test(raw);
  const s = RE_STRUCTURAL.test(raw);
  const t = RE_TENMON_REINT.test(raw);
  const sp = RE_SPECULATIVE.test(raw) || split.symbolicAnalogyHit === true;

  if (sp) riskFlags.push("speculative_connector");
  if (h && sp) riskFlags.push("historical_speculative_mix");
  if (truth?.answerMode === "historical_etymology" && sp) riskFlags.push("etymology_vs_analogy_tension");
  if (truth?.answerMode === "symbolic_mapping") riskFlags.push("truth_layer_symbolic");
  if (katakamunaRawTouchesAuditedSecondaryCorpusV1(raw)) {
    riskFlags.push("katakamuna_secondary_or_popular_corpus_named");
  }

  let sourceMode: SourceLayerModeV1 = "structural_mapping";
  let discernmentReason = "default_structural";
  let safeAnswerConstraint: SafeAnswerConstraintV1 = "treat_as_structural_mapping";

  const foundingQuestion = /いつ成立|成立したのか|いつから|起源は|由来を/u.test(raw);

  if (t) {
    sourceMode = "tenmon_reintegration";
    discernmentReason = "tenmon_reintegration_cue";
    safeAnswerConstraint = "treat_as_tenmon_reintegration";
  } else if (sp && !h && truth?.answerMode !== "historical_etymology") {
    sourceMode = "speculative_analogy";
    discernmentReason = "speculative_language_without_historical_anchor";
    safeAnswerConstraint = "treat_as_speculative_only";
  } else if ((l || foundingQuestion) && /カタカムナ|神代|神話|伝承の成立/u.test(raw)) {
    sourceMode = "lineage_discernment";
    discernmentReason = "founding_or_provenance_on_tradition_text";
    safeAnswerConstraint = "treat_as_lineage_discernment";
    if (h) riskFlags.push("historical_lexical_on_founding_question");
  } else if (h || truth?.answerMode === "historical_etymology") {
    sourceMode = "historical_fact";
    discernmentReason = h ? "historical_lexical_cue" : "truth_layer_historical_etymology";
    safeAnswerConstraint = "treat_as_historical";
    if (sp) {
      riskFlags.push("downgrade_speculative_under_historical_priority");
    }
  } else if (l || foundingQuestion) {
    sourceMode = "lineage_discernment";
    discernmentReason = "lineage_or_provenance_question";
    safeAnswerConstraint = "treat_as_lineage_discernment";
  } else if (s || truth?.answerMode === "comparative_reconstruction") {
    sourceMode = "structural_mapping";
    discernmentReason = "structural_or_comparative_cue";
    safeAnswerConstraint = "treat_as_structural_mapping";
  } else if (truth?.answerMode === "symbolic_mapping") {
    sourceMode = "speculative_analogy";
    discernmentReason = "truth_layer_symbolic_mapping";
    safeAnswerConstraint = "treat_as_speculative_only";
  } else if (truth?.answerMode === "canon_grounded") {
    sourceMode = "lineage_discernment";
    discernmentReason = "canon_grounded_reads_as_lineage_scriptural";
    safeAnswerConstraint = "treat_as_lineage_discernment";
  }

  return {
    schema: "TENMON_SOURCE_LAYER_DISCERNMENT_V1",
    sourceMode,
    riskFlags,
    discernmentReason,
    safeAnswerConstraint,
  };
}
