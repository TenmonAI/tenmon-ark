/**
 * TENMON_DISCERNMENT_PARENT: 系譜・変容・史実層と写像層の分離判断
 *
 * カタカムナ専用の系譜束・変形束は `katakamunaLineageTransformationEngine`（継承軸と意味変形軸の分離）。
 */

import type { SourceLayerDiscernmentV1 } from "./sourceLayerDiscernmentKernel.js";
import type { InputSemanticSplitResultV1 } from "./inputSemanticSplitter.js";

export type LineageClassV1 = "scriptural_or_textual" | "institutional" | "folk_or_vernacular" | "unknown";
export type TransformationClassV1 = "continuity" | "rupture" | "syncretism" | "neutral";
export type DiscernmentCertaintyV1 = "low" | "medium" | "high";

export type LineageTransformationJudgementV1 = {
  schema: "TENMON_LINEAGE_AND_TRANSFORMATION_JUDGEMENT_V1";
  lineageClass: LineageClassV1;
  transformationClass: TransformationClassV1;
  historicalCertainty: DiscernmentCertaintyV1;
  mappingCertainty: DiscernmentCertaintyV1;
  shouldSeparateLayers: boolean;
  displayPolicy: string;
};

export type LineageTransformationInputV1 = {
  discernment: SourceLayerDiscernmentV1;
  split: InputSemanticSplitResultV1;
  rawMessage: string;
};

export function judgeLineageAndTransformationV1(input: LineageTransformationInputV1): LineageTransformationJudgementV1 {
  const raw = String(input.rawMessage || "").trim();
  const d = input.discernment;

  let lineageClass: LineageClassV1 = "unknown";
  if (/経典|聖典|写本|注釈|原典/u.test(raw)) lineageClass = "scriptural_or_textual";
  else if (/寺社|宗派|制度|組織/u.test(raw)) lineageClass = "institutional";
  else if (/民間|俗説|通説|ネット/u.test(raw)) lineageClass = "folk_or_vernacular";

  let transformationClass: TransformationClassV1 = "neutral";
  if (/変貌|断絶|転換|否定/u.test(raw)) transformationClass = "rupture";
  else if (/融合|混交|習合|層累/u.test(raw)) transformationClass = "syncretism";
  else if (/連続|伝承|系譜/u.test(raw)) transformationClass = "continuity";

  let historicalCertainty: DiscernmentCertaintyV1 = "medium";
  if (/いつ|成立|起源|誰が/u.test(raw) && /カタカムナ|神代|神話/u.test(raw)) historicalCertainty = "low";
  else if (d.sourceMode === "speculative_analogy") historicalCertainty = "low";
  else if (d.sourceMode === "historical_fact") historicalCertainty = "medium";

  let mappingCertainty: DiscernmentCertaintyV1 = "medium";
  if (d.sourceMode === "structural_mapping" || d.sourceMode === "tenmon_reintegration") mappingCertainty = "high";
  if (d.sourceMode === "speculative_analogy") mappingCertainty = "low";

  const shouldSeparateLayers =
    d.riskFlags.includes("historical_speculative_mix") ||
    d.riskFlags.includes("etymology_vs_analogy_tension") ||
    (d.sourceMode === "tenmon_reintegration" && historicalCertainty === "low") ||
    (d.sourceMode === "lineage_discernment" && d.riskFlags.includes("speculative_connector")) ||
    (d.sourceMode === "lineage_discernment" && historicalCertainty === "low");

  const displayPolicy = shouldSeparateLayers
    ? "separate_historical_narrative_from_mapping_and_speculation"
    : "single_lane_ok";

  return {
    schema: "TENMON_LINEAGE_AND_TRANSFORMATION_JUDGEMENT_V1",
    lineageClass,
    transformationClass,
    historicalCertainty,
    mappingCertainty,
    shouldSeparateLayers,
    displayPolicy,
  };
}

export {
  buildKatakamunaLineageTransformationBundleV1,
  type KatakamunaDivergenceTagV1,
  type KatakamunaLineageEdgeV1,
  type KatakamunaLineageTransformationBundleV1,
  type KatakamunaTransformationLayerV1,
} from "./katakamunaLineageTransformationEngine.js";
