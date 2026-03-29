/**
 * TENMON_TRUTH_LAYER_ARBITRATION_KERNEL_CURSOR_AUTO_V1
 * SplitResult × binder/notion/scripture 観測を単一の回答レーンに収束（補助裁定・routeReason は変更しない）
 *
 * TENMON_UNCERTAINTY_AND_CONFIDENCE_SURFACE_LOGIC: answerMode / coreTruth は不変。
 * 表層の high/partial/low/guarded は confidenceDisplayLogic.buildUncertaintyConfidenceDisplayV1（raw・ev・guard・canon 強度の合成）。
 */

import type { InputSemanticHeartHintV1, InputSemanticSplitResultV1 } from "./inputSemanticSplitter.js";

export type TruthLayerAnswerModeV1 =
  | "canon_grounded"
  | "historical_etymology"
  | "symbolic_mapping"
  | "comparative_reconstruction"
  | "general_guidance";

export type TruthLayerDepthPolicyV1 = "surface" | "mid" | "deep" | "hold_shallow_under_danshari";

/** binder / ku から抽出した最小知識束（本カードは噴出抑止用の観測のみ） */
export type TruthLayerKnowledgePackV1 = {
  routeReason: string;
  rawMessage: string;
  sourcePack: string;
  centerKey: string | null;
  centerLabel: string | null;
  evidenceRefs: readonly string[];
  notionCanonCount: number;
  uncertaintyFlagCount: number;
  groundedRequired: boolean;
};

export type TruthLayerArbitrationResultV1 = {
  schema: "TENMON_TRUTH_LAYER_ARBITRATION_V1";
  answerMode: TruthLayerAnswerModeV1;
  coreTruth: string;
  supportingEvidence: string[];
  droppedCandidates: string[];
  danshari: boolean;
  forbidFlags: string[];
  depthPolicy: TruthLayerDepthPolicyV1;
};

/** カード表記 `ArbitrationResult` との整合 */
export type ArbitrationResult = TruthLayerArbitrationResultV1;

export type TruthLayerArbitrationInputV1 = {
  split: InputSemanticSplitResultV1;
  knowledge: TruthLayerKnowledgePackV1;
  heartHint?: InputSemanticHeartHintV1 | null;
};

const RE_ETYMOLOGY =
  /サンスクリット|Sanskrit|sanskrit|梵|語源|悉曇|BHS|転写|形態素|解読|混和梵語|佛教混合|仏教混合|Hybrid\s*Sanskrit/u;
const RE_ETYMOLOGY_ANCHOR = /金毘羅|コンピラ|神名|仏名|陀羅尼|真言/u;
const RE_SYMBOLIC_RAW = /ノア|方舟|重なる|重ねて|アナロジ|メタファ|たとえ|比喩|象徴|類似|同型|重ねられる/u;
const RE_COMPARATIVE = /比較|対比|違いは|並べて|整理して|再構成|二つを/u;
const RE_SCRIPTURE_PACK = /scripture|seiten|canon/u;

function countActiveLanes(args: {
  hist: boolean;
  sym: boolean;
  canon: boolean;
  comp: boolean;
}): number {
  return Number(args.hist) + Number(args.sym) + Number(args.canon) + Number(args.comp);
}

function depthFromSplit(
  split: InputSemanticSplitResultV1,
  danshari: boolean,
): TruthLayerDepthPolicyV1 {
  if (danshari) return "hold_shallow_under_danshari";
  if (split.contextDepth === "deep") return "deep";
  if (split.contextDepth === "mid") return "mid";
  return "surface";
}

/**
 * 単一 answerMode を選び、採用根拠・捨象候補・禁止フラグを返す（LLM なし）
 */
export function arbitrateTruthLayerV1(input: TruthLayerArbitrationInputV1): TruthLayerArbitrationResultV1 {
  const { split, knowledge } = input;
  const raw = String(knowledge.rawMessage || "").trim();
  const sp = String(knowledge.sourcePack || "").toLowerCase();

  const histStrong =
    RE_ETYMOLOGY.test(raw) &&
    (RE_ETYMOLOGY_ANCHOR.test(raw) || /語源|解読|読み|転写/u.test(raw));
  const symStrong = split.symbolicAnalogyHit === true || RE_SYMBOLIC_RAW.test(raw);
  const compStrong = RE_COMPARATIVE.test(raw);
  const canonStrong =
    (split.canonHit || split.kotodamaHit) &&
    (RE_SCRIPTURE_PACK.test(sp) ||
      knowledge.groundedRequired ||
      /DEF_|SCRIPTURE|TRUTH_GATE|KATAKAMUNA/u.test(knowledge.routeReason) ||
      split.intentClass === "define");

  const laneN = countActiveLanes({
    hist: histStrong,
    sym: symStrong,
    canon: canonStrong,
    comp: compStrong,
  });
  const danshari = laneN >= 2 || (knowledge.uncertaintyFlagCount >= 3 && knowledge.notionCanonCount >= 4);

  let answerMode: TruthLayerAnswerModeV1 = "general_guidance";
  if (histStrong) answerMode = "historical_etymology";
  else if (symStrong) answerMode = "symbolic_mapping";
  else if (compStrong) answerMode = "comparative_reconstruction";
  else if (canonStrong) answerMode = "canon_grounded";
  else answerMode = "general_guidance";

  const ev = Array.isArray(knowledge.evidenceRefs) ? [...knowledge.evidenceRefs] : [];
  const maxEv = danshari ? 1 : 3;
  const supportingEvidence = ev.slice(0, maxEv).map((s) => String(s).slice(0, 120));
  const droppedCandidates: string[] = [];
  if (ev.length > maxEv) {
    droppedCandidates.push(`evidence_capped:${ev.length}->${maxEv}`);
  }
  if (histStrong && symStrong) droppedCandidates.push("lane_drop:symbolic_under_etymology_priority");
  if (histStrong && canonStrong) droppedCandidates.push("lane_drop:canon_under_etymology_priority");
  if (symStrong && canonStrong && answerMode === "symbolic_mapping") {
    droppedCandidates.push("lane_drop:canon_narrative_deferred_for_analogy");
  }
  if (danshari) droppedCandidates.push("danshari:multi_lane_or_high_verbosity_pressure");

  const forbidFlags: string[] = [];
  if (answerMode === "canon_grounded") {
    forbidFlags.push("no_speculative_history_as_fact", "no_symbolic_merge_without_label");
  } else if (answerMode === "historical_etymology") {
    forbidFlags.push("no_canon_dogma_without_sources", "no_identity_claims_without_confidence");
  } else if (answerMode === "symbolic_mapping") {
    forbidFlags.push("no_literal_history_timeline_claim", "no_scripture_proof_by_analogy");
  } else if (answerMode === "comparative_reconstruction") {
    forbidFlags.push("no_single_source_totalization");
  } else {
    forbidFlags.push("no_unbounded_multi_domain_merge");
  }

  const label = knowledge.centerLabel || knowledge.centerKey || "この主題";
  const coreTruth =
    answerMode === "canon_grounded"
      ? `正典・教義の軸で「${label}」の立脚を一文に固定し、引用束は最小限に留める。`
      : answerMode === "historical_etymology"
        ? `語史・転写・比定の軸で「${label}」を扱い、未確定は未確定として明示する。`
        : answerMode === "symbolic_mapping"
          ? `象徴・類比の軸で「${label}」を扱い、史実命題へ滑らせない。`
          : answerMode === "comparative_reconstruction"
            ? `比較軸を一つに固定し、「${label}」周辺の対立・接続を再構成する。`
            : `一般導線で「${label}」に答え、過剰な正典・語史・類比の同時展開を避ける。`;

  void input.heartHint;

  return {
    schema: "TENMON_TRUTH_LAYER_ARBITRATION_V1",
    answerMode,
    coreTruth,
    supportingEvidence,
    droppedCandidates,
    danshari,
    forbidFlags,
    depthPolicy: depthFromSplit(split, danshari),
  };
}
