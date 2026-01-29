// src/kanagi/core/corePlan.ts
// TENMON-ARK: CorePlan is a deterministic container (no LLM). Keep minimal and stable.

export type ClaimLevel = "FACT" | "HYPOTHESIS" | "QUESTION";

export type CoreClaim = {
  text: string;
  evidenceIds: string[];
  level: ClaimLevel;
};

export type CorePlan = {
  centerClaim: string;
  claims: CoreClaim[];
  evidenceIds: string[];
  warnings: string[];
  chainOrder: string[];
};

// Minimal empty plan (wiring / early phases)
export function emptyCorePlan(centerClaim = ""): CorePlan {
  return {
    centerClaim,
    claims: [],
    evidenceIds: [],
    warnings: [],
    chainOrder: [],
  };
}

