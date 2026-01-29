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

export function emptyCorePlan(centerClaim = ""): CorePlan {
  return {
    centerClaim,
    claims: [],
    evidenceIds: [],
    warnings: [],
    chainOrder: [],
  };
}

