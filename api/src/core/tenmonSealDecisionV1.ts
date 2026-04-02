
export interface SealDecision {
  sealed: boolean;
  decision_source: string;
  stage: string;
  reason_codes: string[];
  blockers: string[];
  evidence_refs: string[];
  acceptance_binding: boolean;
}

export function buildSealDecisionV1(args: {
  promotionGateResult?: { decision: string; reason_codes: string[]; evidence_refs: string[] };
  acceptanceBinding?: boolean;
  blockers?: string[];
}): SealDecision {
  const pg = args.promotionGateResult;
  const sealed = pg?.decision === "pass" && (args.acceptanceBinding ?? false);
  return {
    sealed,
    decision_source: "promotion_gate_v1",
    stage: pg?.decision ?? "unknown",
    reason_codes: pg?.reason_codes ?? [],
    blockers: args.blockers ?? (sealed ? [] : ["acceptance_not_bound"]),
    evidence_refs: pg?.evidence_refs ?? [],
    acceptance_binding: args.acceptanceBinding ?? false,
  };
}

export type TenmonSealDecisionV1 = SealDecision;

export function buildTenmonSealDecisionV1(args: {
  decisionSource?: string;
  stage?: string;
  acceptanceObserved?: boolean;
  acceptanceSource?: string;
  reasons?: string[];
  blockers?: string[];
  evidenceRefs?: string[];
}): SealDecision {
  const sealed = args.acceptanceObserved ?? false;
  return {
    sealed,
    decision_source: args.decisionSource ?? "unknown",
    stage: args.stage ?? "unknown",
    reason_codes: args.reasons ?? [],
    blockers: args.blockers ?? (sealed ? [] : ["acceptance_not_bound"]),
    evidence_refs: args.evidenceRefs ?? [],
    acceptance_binding: sealed,
  };
}
