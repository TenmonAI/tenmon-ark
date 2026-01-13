// src/kanagi/verifier.ts
// Verifier: claimのevidenceIds検証

import type { EvidenceLaw, EvidencePack, CoreClaim } from "./kanagiCore.js";

export type VerificationResult = {
  valid: boolean;
  failedClaims: Array<{ claim: CoreClaim; reason: string }>;
  warnings: string[];
};

/**
 * claimのevidenceIdsが本文に存在するか検証
 */
function verifyClaimEvidence(
  claim: CoreClaim,
  evidence: EvidencePack
): { valid: boolean; reason?: string } {
  // evidenceIdsが必須
  if (claim.evidenceIds.length === 0) {
    return { valid: false, reason: "evidenceIdsが空です" };
  }
  
  // 各evidenceIdのquoteが本文に存在するか確認
  const pageText = evidence.pageText.toLowerCase();
  const allQuotes: string[] = [];
  
  for (const lawId of claim.evidenceIds) {
    const law = evidence.laws.find(l => l.id === lawId);
    if (!law) {
      return { valid: false, reason: `lawId ${lawId} がevidence.lawsに見つかりません` };
    }
    
    // quoteが本文に存在するか（簡易：部分一致）
    const quoteLower = law.quote.toLowerCase();
    if (!pageText.includes(quoteLower.slice(0, 50))) {
      // 長いquoteの場合は最初の50文字で検証
      return { valid: false, reason: `lawId ${lawId} のquoteが本文に存在しません` };
    }
    
    allQuotes.push(law.quote);
  }
  
  return { valid: true };
}

/**
 * CorePlanのclaimsを検証
 */
export function verifyCorePlan(
  claims: CoreClaim[],
  evidence: EvidencePack
): VerificationResult {
  const failedClaims: Array<{ claim: CoreClaim; reason: string }> = [];
  const warnings: string[] = [];
  
  for (const claim of claims) {
    const result = verifyClaimEvidence(claim, evidence);
    if (!result.valid) {
      failedClaims.push({
        claim,
        reason: result.reason || "検証失敗",
      });
    }
  }
  
  // 警告：根拠が少ない
  if (evidence.laws.length === 0) {
    warnings.push("根拠（laws）が空です");
  }
  
  if (evidence.pageText.length < 100) {
    warnings.push("ページ本文が短すぎます（100文字未満）");
  }
  
  const valid = failedClaims.length === 0;
  
  return {
    valid,
    failedClaims,
    warnings,
  };
}

/**
 * 検証に失敗したclaimsを除外
 */
export function filterValidClaims(
  claims: CoreClaim[],
  evidence: EvidencePack
): CoreClaim[] {
  return claims.filter(claim => {
    const result = verifyClaimEvidence(claim, evidence);
    return result.valid;
  });
}

