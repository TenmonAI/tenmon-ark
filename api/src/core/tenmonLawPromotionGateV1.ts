export interface PromotionGateResult {
  decision: "pass" | "hold" | "reject";
  reason_codes: string[];
  evidence_refs: string[];
  acceptance_binding: boolean;
  promotedLawIds: string[];
  blockedLawIds: string[];
  reasonCodes: readonly string[];
  promotionGateVerdict: "allow" | "observe" | "block";
}

export type PromotionCandidateType = "memory" | "law" | "summary" | "response" | string;
export type PromotionGateOutputV1 = PromotionGateResult;
export type LawPromotionGateBundleV1 = PromotionGateResult;

export interface PromotionGateInputV1 {
  candidateType?: PromotionCandidateType;
  centerKey?: string;
  evidence?: string[] | null;
  routeReason?: string;
  contradictionRisk?: number | null;
}

function normalizeRisk(v: number | null | undefined): number {
  if (typeof v !== "number" || Number.isNaN(v)) return 0.5;
  return Math.max(0, Math.min(1, v));
}

function normalizeEvidence(v: string[] | null | undefined): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x || "").trim()).filter(Boolean);
}

export function evaluatePromotionGateV1(input: PromotionGateInputV1): PromotionGateResult {
  const centerKey = String(input.centerKey || "").trim();
  const risk = normalizeRisk(input.contradictionRisk);
  const ev = normalizeEvidence(input.evidence);
  const rc: string[] = [];
  if (!centerKey) {
    rc.push("CENTER_KEY_EMPTY");
    return { decision: "reject", reason_codes: rc, evidence_refs: ev, acceptance_binding: false, promotionGateVerdict: "block", promotedLawIds: [], blockedLawIds: ev, reasonCodes: rc };
  }
  if (risk >= 0.9) {
    rc.push("RISK_CRITICAL");
    return { decision: "reject", reason_codes: rc, evidence_refs: ev, acceptance_binding: false, promotionGateVerdict: "block", promotedLawIds: [], blockedLawIds: ev, reasonCodes: rc };
  }
  if (ev.length === 0) {
    rc.push("EVIDENCE_WEAK");
    return { decision: "hold", reason_codes: rc, evidence_refs: ev, acceptance_binding: false, promotionGateVerdict: "observe", promotedLawIds: [], blockedLawIds: [], reasonCodes: rc };
  }
  if (risk >= 0.4) {
    rc.push("RISK_MEDIUM");
    return { decision: "hold", reason_codes: rc, evidence_refs: ev, acceptance_binding: false, promotionGateVerdict: "observe", promotedLawIds: [], blockedLawIds: [], reasonCodes: rc };
  }
  rc.push("PROMOTION_PASS");
  return { decision: "pass", reason_codes: rc, evidence_refs: ev, acceptance_binding: true, promotionGateVerdict: "allow", promotedLawIds: ev, blockedLawIds: [], reasonCodes: rc };
}

export const evaluateTenmonLawPromotionGateV1 = evaluatePromotionGateV1;

export function resolveLawPromotionGateV1(digestPromotions: unknown): PromotionGateResult {
  const dp = digestPromotions as Record<string, unknown> | undefined;
  return evaluatePromotionGateV1({
    centerKey: String(dp?.centerKey ?? ""),
    evidence: Array.isArray(dp?.evidence) ? (dp.evidence as string[]) : [],
    routeReason: String(dp?.routeReason ?? ""),
    contradictionRisk: Number(dp?.contradictionRisk ?? 0),
  });
}

export function runTenmonLawPromotionGateV1(args: PromotionGateInputV1): PromotionGateResult {
  return evaluatePromotionGateV1(args);
}
