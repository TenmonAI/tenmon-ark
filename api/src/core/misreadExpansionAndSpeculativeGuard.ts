/**
 * TENMON_DISCERNMENT_PARENT: 誤認拡大・推測を史実口調で返さないガード
 *
 * カタカムナ文脈では `tenmonKatakamunaReintegrationBindV1` と整合し、再統合層を historical fact と混線させない。
 */

import type { SourceLayerDiscernmentV1 } from "./sourceLayerDiscernmentKernel.js";
import type { LineageTransformationJudgementV1 } from "./lineageAndTransformationJudgementEngine.js";
import { shouldTenmonKatakamunaReintegrationTightenHistoricalGuardV1 } from "./tenmonKatakamunaReintegrationBindV1.js";

export type SpeculativeGuardRiskV1 = "low" | "medium" | "high";

export type SpeculativeGuardV1 = {
  schema: "TENMON_SPECULATIVE_GUARD_V1";
  speculativeRisk: SpeculativeGuardRiskV1;
  expansionRisk: SpeculativeGuardRiskV1;
  forbidHistoricalTone: boolean;
  forbidDefinitiveClaim: boolean;
  safeRephraseHint: string;
};

export type SpeculativeGuardInputV1 = {
  discernment: SourceLayerDiscernmentV1;
  lineageJudgement: LineageTransformationJudgementV1;
  rawMessage: string;
  routeReason?: string | null;
  centerKey?: string | null;
};

export function buildSpeculativeGuardV1(input: SpeculativeGuardInputV1): SpeculativeGuardV1 {
  const d = input.discernment;
  const j = input.lineageJudgement;
  const raw = String(input.rawMessage || "").trim();

  let speculativeRisk: SpeculativeGuardRiskV1 = "low";
  if (d.sourceMode === "speculative_analogy") speculativeRisk = "high";
  else if (d.riskFlags.includes("speculative_connector")) speculativeRisk = "medium";

  let expansionRisk: SpeculativeGuardRiskV1 = "low";
  if (/すべては|つまり世界|本質は一つ|完全に同じ/u.test(raw)) expansionRisk = "high";
  else if (d.riskFlags.includes("historical_speculative_mix")) expansionRisk = "medium";

  let forbidHistoricalTone =
    d.sourceMode === "speculative_analogy" ||
    speculativeRisk === "high" ||
    (speculativeRisk === "medium" && j.historicalCertainty === "low");

  let forbidDefinitiveClaim =
    forbidHistoricalTone ||
    j.historicalCertainty === "low" ||
    j.shouldSeparateLayers;

  let safeRephraseHint =
    d.sourceMode === "speculative_analogy"
      ? "象徴や類比として重ね読みはできるが、史実の同一や年代の確定として述べない。"
      : j.historicalCertainty === "low" && /いつ|成立/u.test(raw)
        ? "成立年代や単一起源は史料上断定しにくい点を明示し、説の整理に留める。"
        : j.shouldSeparateLayers
          ? "歴史叙述・系譜・構造写像を一文に圧縮せず、層を分けて述べる。"
          : "断定が必要な箇所は根拠の度合いに合わせて語気を抑える。";

  if (
    shouldTenmonKatakamunaReintegrationTightenHistoricalGuardV1({
      rawMessage: raw,
      routeReason: String(input.routeReason ?? ""),
      centerKey: input.centerKey ?? null,
    })
  ) {
    if (speculativeRisk === "low") speculativeRisk = "medium";
    forbidHistoricalTone = true;
    forbidDefinitiveClaim = true;
    safeRephraseHint =
      "天聞でのカタカムナは歴史定説や普及本の本流一括として述べず、言霊秘書・水穂伝・稲荷古伝を root に、カタカムナを mapping 先、天聞応答を再統合の整理として述べる。宇野以降の変貌は transformation 参照。";
  }

  return {
    schema: "TENMON_SPECULATIVE_GUARD_V1",
    speculativeRisk,
    expansionRisk,
    forbidHistoricalTone,
    forbidDefinitiveClaim,
    safeRephraseHint,
  };
}

// --- responseComposer 互換（shelter スタブ相当・fail-open） ---

export type MisreadExpansionGuardSnapshotV1 = {
  active?: boolean;
  surfaceHint?: string;
};

export function shouldApplyMisreadExpansionGuardV1(
  _routeReason: string,
  _centerKey: string | null,
  _rawMessage: string,
): boolean {
  return false;
}

export function buildMisreadExpansionAndSpeculativeGuardSnapshotV1(
  _rawMessage: string,
  _response: string,
): MisreadExpansionGuardSnapshotV1 | null {
  return null;
}

export function applyMisreadExpansionGuardToSurfaceV1(
  response: string,
  _snapshot: MisreadExpansionGuardSnapshotV1,
  _routeReason: string,
  _rawMessage: string,
): string {
  return String(response ?? "");
}
