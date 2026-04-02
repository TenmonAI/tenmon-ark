export type PromotionCandidateType = "memory" | "law" | "summary" | "response" | string;

export interface PromotionGateInputV1 {
  candidateType: PromotionCandidateType;
  centerKey: string;
  evidence?: string[] | null;
  routeReason: string;
  contradictionRisk?: number | null;
}

export interface PromotionGateOutputV1 {
  decision: "pass" | "hold" | "reject";
  reason_codes: string[];
  evidence_refs: string[];
  acceptance_binding: boolean;
}

function normalizeRisk(risk: number | null | undefined): number {
  if (typeof risk !== "number" || Number.isNaN(risk)) return 0.5;
  return Math.max(0, Math.min(1, risk));
}

function normalizeEvidence(evidence: string[] | null | undefined): string[] {
  if (!Array.isArray(evidence)) return [];
  return evidence.map((x) => String(x || "").trim()).filter((x) => x.length > 0);
}

export function evaluatePromotionGateV1(input: PromotionGateInputV1): PromotionGateOutputV1 {
  const centerKey = String(input.centerKey || "").trim();
  const risk = normalizeRisk(input.contradictionRisk);
  const evidenceRefs = normalizeEvidence(input.evidence);
  const reasonCodes: string[] = [];

  if (!centerKey) {
    reasonCodes.push("CENTER_KEY_EMPTY");
    return {
      decision: "reject",
      reason_codes: reasonCodes,
      evidence_refs: evidenceRefs,
      acceptance_binding: false,
    };
  }

  if (risk >= 0.9) {
    reasonCodes.push("RISK_CRITICAL");
    return {
      decision: "reject",
      reason_codes: reasonCodes,
      evidence_refs: evidenceRefs,
      acceptance_binding: false,
    };
  }

  if (evidenceRefs.length === 0) {
    reasonCodes.push("EVIDENCE_WEAK");
    return {
      decision: "hold",
      reason_codes: reasonCodes,
      evidence_refs: evidenceRefs,
      acceptance_binding: false,
    };
  }

  if (risk >= 0.4 && risk <= 0.7) {
    reasonCodes.push("RISK_MEDIUM");
    return {
      decision: "hold",
      reason_codes: reasonCodes,
      evidence_refs: evidenceRefs,
      acceptance_binding: false,
    };
  }

  if (risk < 0.7 && evidenceRefs.length > 0) {
    reasonCodes.push("PROMOTION_PASS");
    return {
      decision: "pass",
      reason_codes: reasonCodes,
      evidence_refs: evidenceRefs,
      acceptance_binding: true,
    };
  }

  reasonCodes.push("PROMOTION_HOLD_DEFAULT");
  return {
    decision: "hold",
    reason_codes: reasonCodes,
    evidence_refs: evidenceRefs,
    acceptance_binding: false,
  };
}

export const evaluateTenmonLawPromotionGateV1 = evaluatePromotionGateV1;
