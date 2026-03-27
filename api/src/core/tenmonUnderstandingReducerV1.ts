/**
 * TENMON_INTERNAL_UNDERSTANDING_REDUCTION_KERNEL_V1
 * 取得知識・資料断片をそのまま表に出さず、内部の「中心理解」へ還元したメタを thoughtCoreSummary に非破壊で付与する。
 * 本文は本カーネルでは改変しない（fail-closed）。
 */

import type { TenmonKnowledgeTierV1 } from "./tenmonKnowledgePriorityKernelV1.js";

export type TenmonUnderstandingReductionBundleV1 = {
  card: "TENMON_INTERNAL_UNDERSTANDING_REDUCTION_KERNEL_CURSOR_AUTO_V1";
  version: 1;
  centerClaim: string;
  centerMeaning: string;
  understandingAxis: string;
  knowledgeTension: unknown;
  resolvedPrioritySource: TenmonKnowledgeTierV1 | string;
};

function stripArtifactNoise(s: string): string {
  return String(s || "")
    .replace(/\b(doc|pdfPage|KHSL:|NAS:|file:|\/opt\/)[^\s]*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildUnderstandingAxis(rr: string, primary: string, raw: string): string {
  const r = raw.replace(/\s+/g, " ").trim();
  if (/^CONTINUITY_/u.test(rr)) return "continuity_hold";
  if (/SCRIPTURE|TENMON_SCRIPTURE|法華|hokekyo|経典/u.test(rr + r)) return "scripture_canon";
  if (/GENERAL_KNOWLEDGE|水火/u.test(rr + r)) return "general_tenmon_axis";
  if (/言霊|kotodama|DEF_FASTPATH|DEF_/u.test(rr + r)) return "kotodama_define";
  if (/R22_SELFAWARE|意識|CONSCIOUSNESS/u.test(rr + r)) return "selfaware_meta";
  if (/違い|比べ|GPT|混在/u.test(r)) return "mixed_compare";
  return `tier:${primary}`;
}

function buildReducedCenterMeaning(raw: string, rr: string, primary: string): string {
  const t = stripArtifactNoise(raw).slice(0, 200);
  if (/法華経|法華/u.test(t)) return "法華経の教義位置づけと読みの芯を問う";
  if (/水火の法則/u.test(t)) return "水火の法則の意味と天聞での扱いを問う";
  if (/言霊/u.test(t)) return "言霊概念の定義と正典上の位置づけを問う";
  if (/違い|比べ|GPT|天聞の軸/u.test(t)) return "複数説明系統の差分を天聞軸で整理する問い";
  if (/^CONTINUITY_/u.test(rr)) return "同一スレッド上の継続・一段深めを問う";
  if (/意識|AIに/u.test(t)) return "自己／意識のメタ問いを扱う";
  return `中心命題: ${t.slice(0, 88)} (pri:${primary})`;
}

function buildReducedCenterClaim(raw: string, rr: string, primary: string): string {
  const m = buildReducedCenterMeaning(raw, rr, primary);
  return m.length > 160 ? `${m.slice(0, 157)}...` : m;
}

/**
 * thoughtCoreSummary に understandingReductionV1 を付与。
 * 既存の routeReason / thoughtCoreSummary.centerMeaning 等は上書きしない（空欄時のみ補完）。
 */
export function attachUnderstandingReductionToKuV1(ku: Record<string, unknown>, rawMessage: string): void {
  const raw = stripArtifactNoise(rawMessage);
  const rr = String(ku.routeReason ?? "").trim();
  const kpk = ku.knowledgePriorityKernelV1 as Record<string, unknown> | undefined;
  const primary = String(kpk?.primary_tier ?? "llm_auxiliary") as TenmonKnowledgeTierV1 | string;
  const tension = ku.knowledgeTension ?? null;

  if (!ku.thoughtCoreSummary || typeof ku.thoughtCoreSummary !== "object" || Array.isArray(ku.thoughtCoreSummary)) {
    ku.thoughtCoreSummary = {};
  }
  const th = ku.thoughtCoreSummary as Record<string, unknown>;

  const bundle: TenmonUnderstandingReductionBundleV1 = {
    card: "TENMON_INTERNAL_UNDERSTANDING_REDUCTION_KERNEL_CURSOR_AUTO_V1",
    version: 1,
    centerClaim: buildReducedCenterClaim(raw, rr, String(primary)),
    centerMeaning: buildReducedCenterMeaning(raw, rr, String(primary)),
    understandingAxis: buildUnderstandingAxis(rr, String(primary), raw),
    knowledgeTension: tension,
    resolvedPrioritySource: primary,
  };

  th.understandingReductionV1 = bundle;

  if (!String(ku.centerClaim ?? "").trim()) {
    (ku as Record<string, unknown>).centerClaim = bundle.centerClaim.slice(0, 240);
  }
  if (!String(th.centerMeaning ?? "").trim()) {
    th.centerMeaning = bundle.centerMeaning.slice(0, 240);
  }
}
