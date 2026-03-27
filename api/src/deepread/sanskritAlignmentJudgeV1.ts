import type { SanskritRootEngineOutputV1 } from "./sanskritRootEngineV1.js";
import type { TenmonGodnameMapperOutputV1 } from "./tenmonGodnameMapperV1.js";

export type SanskritAlignmentJudgeOutputV1 = {
  schema: "TENMON_SANSKRIT_ALIGNMENT_JUDGE_V1";
  strict_etymology: string;
  tradition_evidence: string[];
  tenmon_hypothesis: string;
  uncertain_points: string[];
  final_judgement: "aligned" | "partially_aligned" | "uncertain";
};

function pushOnce(arr: string[], v: string): void {
  const t = String(v || "").trim();
  if (!t) return;
  if (!arr.includes(t)) arr.push(t);
}

export function judgeSanskritAlignmentV1(args: {
  strict: SanskritRootEngineOutputV1;
  mapping: TenmonGodnameMapperOutputV1;
}): SanskritAlignmentJudgeOutputV1 {
  const strict = args.strict;
  const mapping = args.mapping;
  const uncertain: string[] = [...strict.uncertain_points];

  const ranked = strict.sanskrit_candidates_ranked;
  const top = ranked[0];
  const hasConflict =
    ranked.length >= 2 &&
    Math.abs((ranked[0]?.score ?? 0) - (ranked[1]?.score ?? 0)) <= 0.08;
  if (hasConflict) pushOnce(uncertain, "candidate_conflict_top2_close");

  if (strict.evidence_refs.length < 1) pushOnce(uncertain, "evidence_weak_or_missing");
  if (strict.strict_confidence < 0.5) pushOnce(uncertain, "strict_confidence_low");
  if (mapping.mapping_confidence < 0.5) pushOnce(uncertain, "mapping_confidence_low");

  const mappingText = String(mapping.tenmon_mapping || "");
  if (/(同一|完全一致|identity)/iu.test(mappingText) && strict.strict_confidence < 0.8) {
    pushOnce(uncertain, "unsupported_identity_claim");
  }

  const tradition_evidence = strict.evidence_refs.map((r) => `${r.kind}:${r.ref}`);
  const hasLowConfidence =
    uncertain.includes("strict_confidence_low") || uncertain.includes("mapping_confidence_low");
  let final_judgement: SanskritAlignmentJudgeOutputV1["final_judgement"] = "aligned";
  if (hasLowConfidence || uncertain.length >= 3) final_judgement = "uncertain";
  else if (uncertain.length > 0) final_judgement = "partially_aligned";

  const strict_etymology = strict.strict_etymology;
  const tenmon_hypothesis = mapping.tenmon_mapping;
  if (top && top.status === "uncertain") pushOnce(uncertain, "top_candidate_uncertain");

  return {
    schema: "TENMON_SANSKRIT_ALIGNMENT_JUDGE_V1",
    strict_etymology,
    tradition_evidence,
    tenmon_hypothesis,
    uncertain_points: uncertain,
    final_judgement,
  };
}

