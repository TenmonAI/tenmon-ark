// src/kanagi/verifier.ts
// Verifier: claimのevidenceIds検証

import type { EvidenceLaw, EvidencePack, CoreClaim } from "./kanagiCore.js";

export type VerificationResult = {
  valid: boolean;
  failedClaims: Array<{ claim: CoreClaim; reason: string }>;
  warnings: string[];
};

/**
 * テキストを正規化（小文字/空白圧縮/記号簡易統一）
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[「」『』（）()【】［］\[\]]/g, "")
    .trim();
}

/**
 * アンカー3点方式：長文引用でも誤検知しない検証
 * quoteが長い場合：
 * - 先頭80文字
 * - 中央80文字
 * - 末尾80文字
 * のアンカーを取り、本文に 2/3 以上含まれるとOK
 * 1/3以下はNG → claim を降格/除外
 */
function verifyQuoteWithAnchors(quote: string, pageText: string): { valid: boolean; matchedAnchors: number; totalAnchors: number } {
  const quoteNorm = normalizeText(quote);
  const pageTextNorm = normalizeText(pageText);

  if (quoteNorm.length <= 80) {
    // 短いquoteは全体で検証
    return {
      valid: pageTextNorm.includes(quoteNorm),
      matchedAnchors: pageTextNorm.includes(quoteNorm) ? 1 : 0,
      totalAnchors: 1,
    };
  }

  // 長いquoteは3点アンカーで検証
  const anchors: string[] = [];

  // 先頭80文字
  anchors.push(quoteNorm.slice(0, 80));

  // 中央80文字
  const centerStart = Math.floor((quoteNorm.length - 80) / 2);
  anchors.push(quoteNorm.slice(centerStart, centerStart + 80));

  // 末尾80文字
  anchors.push(quoteNorm.slice(-80));

  let matchedCount = 0;
  for (const anchor of anchors) {
    if (anchor && pageTextNorm.includes(anchor)) {
      matchedCount++;
    }
  }

  // 2/3以上マッチすればOK
  const threshold = Math.ceil(anchors.length * (2 / 3));
  const valid = matchedCount >= threshold;

  return {
    valid,
    matchedAnchors: matchedCount,
    totalAnchors: anchors.length,
  };
}

/**
 * claimのevidenceIdsが本文に存在するか検証（Phase 3: アンカー3点方式）
 */
function verifyClaimEvidence(
  claim: CoreClaim,
  evidence: EvidencePack
): { valid: boolean; reason?: string } {
  // evidenceIdsが必須
  if (claim.evidenceIds.length === 0) {
    return { valid: false, reason: "evidenceIdsが空です" };
  }
  
  // 各evidenceIdのquoteが本文に存在するか確認（アンカー3点方式）
  const pageText = evidence.pageText;
  
  for (const lawId of claim.evidenceIds) {
    const law = evidence.laws.find(l => l.id === lawId);
    if (!law) {
      return { valid: false, reason: `lawId ${lawId} がevidence.lawsに見つかりません` };
    }
    
    // アンカー3点方式で検証
    const result = verifyQuoteWithAnchors(law.quote, pageText);
    if (!result.valid) {
      return {
        valid: false,
        reason: `lawId ${lawId} のquoteが本文に存在しません（マッチ: ${result.matchedAnchors}/${result.totalAnchors}アンカー）`,
      };
    }
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

