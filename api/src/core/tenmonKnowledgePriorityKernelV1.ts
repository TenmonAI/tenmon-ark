/**
 * TENMON_KNOWLEDGE_CIRCULATION_PRIORITY_KERNEL_V1
 * 知識源の優先順位を固定し、衝突時は高位を勝者とし、未解決差分は knowledgeTension にのみ保持（本文へは出さない）。
 *
 * 優先順（1 が最強）:
 * 1 thread continuity / user intent
 * 2 scripture / canon / kokuzo / notion
 * 3 verified internal law / concept pack
 * 4 general knowledge
 * 5 LLM 補助知識
 */

export type TenmonKnowledgeTierV1 =
  | "thread_intent"
  | "scripture_canon_notion_kokuzo"
  | "verified_law_concept"
  | "general_knowledge"
  | "llm_auxiliary";

export const TENMON_KNOWLEDGE_TIER_ORDER_V1: readonly TenmonKnowledgeTierV1[] = [
  "thread_intent",
  "scripture_canon_notion_kokuzo",
  "verified_law_concept",
  "general_knowledge",
  "llm_auxiliary",
] as const;

export type TenmonKnowledgeTensionV1 = {
  suppressed: TenmonKnowledgeTierV1;
  winner: TenmonKnowledgeTierV1;
  reason: "priority_merge_v1";
};

function tierIndex(t: TenmonKnowledgeTierV1): number {
  return TENMON_KNOWLEDGE_TIER_ORDER_V1.indexOf(t);
}

function minTier(tiers: TenmonKnowledgeTierV1[]): TenmonKnowledgeTierV1 | null {
  if (tiers.length === 0) return null;
  let best = tiers[0];
  let bi = tierIndex(best);
  for (let i = 1; i < tiers.length; i++) {
    const ix = tierIndex(tiers[i]);
    if (ix < bi) {
      best = tiers[i];
      bi = ix;
    }
  }
  return best;
}

const SCRIPTURE_ROUTE_RE =
  /^(TENMON_SCRIPTURE_CANON_V1|SCRIPTURE_LOCAL_RESOLVER_V4|TRUTH_GATE_RETURN_V2|KATAKAMUNA_CANON_ROUTE_V1|KUKAI_|IROHA_|KHS_|KHSL:)/u;

const GENERAL_ROUTE_RE =
  /^(GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1|NATURAL_GENERAL_LLM_TOP|ROUTE_GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1)/u;

/** tier 5: 明示一般知識レール以外の LLM 主導応答 */
const LLM_AUX_ROUTE_RE =
  /^(R22_CONVERSATIONAL_|R22_SELFAWARE_|R22_CONSCIOUSNESS_|R22_SELF_REFLECTION_|WORLDVIEW_ROUTE_V1|DEF_LLM_TOP|ABSTRACT_FRAME_VARIATION_V1)/u;

function rrOf(ku: Record<string, unknown>): string {
  return String(ku.routeReason ?? "").trim();
}

function hasThreadContinuitySignals(ku: Record<string, unknown>, rawMessage: string): boolean {
  const rr = rrOf(ku);
  if (/^CONTINUITY_/u.test(rr)) return true;
  const tcs = ku.thoughtCoreSummary;
  if (tcs && typeof tcs === "object" && !Array.isArray(tcs)) {
    const ch = String((tcs as Record<string, unknown>).continuityHint ?? "").trim();
    if (ch) return true;
    const ik = String((tcs as Record<string, unknown>).intentKind ?? "").trim();
    if (/continuity|thread|followup|hold|anchor|carry/i.test(ik)) return true;
  }
  const tc = ku.threadCore;
  if (tc && typeof tc === "object") {
    if (String((tc as Record<string, unknown>).carryMode ?? "").trim()) return true;
  }
  const st = ku.sourceThreadCenter as Record<string, unknown> | undefined;
  if (st && typeof st === "object" && String(st.centerKey ?? "").trim()) return true;
  if (/(その続き|その流れ|前の話|同じスレ|thread)/u.test(rawMessage)) return true;
  return false;
}

function hasScriptureCanonSignals(ku: Record<string, unknown>, rr: string): boolean {
  if (SCRIPTURE_ROUTE_RE.test(rr)) return true;
  if (String(ku.scriptureKey ?? "").trim()) return true;
  if (String(ku.scriptureMode ?? "").trim()) return true;
  const sp = String(ku.sourcePack ?? "").trim();
  if (sp === "scripture" || sp === "seiten") return true;
  const nss = ku.notionCanon;
  if (Array.isArray(nss) && nss.length > 0) return true;
  const ce = ku.conceptEvidence;
  if (ce && typeof ce === "object") return true;
  const sc = ku.scriptureCanon;
  if (sc && typeof sc === "object") return true;
  return false;
}

function hasVerifiedLawSignals(ku: Record<string, unknown>): boolean {
  const laws = ku.lawsUsed;
  if (Array.isArray(laws) && laws.length > 0) return true;
  const ev = ku.evidenceIds;
  if (Array.isArray(ev) && ev.length > 0) return true;
  const lt = ku.lawTrace;
  if (Array.isArray(lt) && lt.length > 0) return true;
  const cc = ku.conceptCanon;
  if (cc && typeof cc === "object") return true;
  const sc = ku.subconceptCanon;
  if (sc && typeof sc === "object") return true;
  return false;
}

function hasGeneralKnowledgeSignals(ku: Record<string, unknown>, rr: string): boolean {
  if (GENERAL_ROUTE_RE.test(rr)) return true;
  const gk = ku.groundingSelector;
  if (gk && typeof gk === "object" && String((gk as Record<string, unknown>).groundingMode ?? "").includes("general")) return true;
  return false;
}

function hasLlmAuxiliarySignals(ku: Record<string, unknown>, rr: string): boolean {
  if (LLM_AUX_ROUTE_RE.test(rr)) return true;
  return false;
}

export function collectActiveKnowledgeTiersV1(ku: Record<string, unknown>, rawMessage: string): TenmonKnowledgeTierV1[] {
  const rr = rrOf(ku);
  const out: TenmonKnowledgeTierV1[] = [];
  if (hasThreadContinuitySignals(ku, rawMessage)) out.push("thread_intent");
  if (hasScriptureCanonSignals(ku, rr)) out.push("scripture_canon_notion_kokuzo");
  if (hasVerifiedLawSignals(ku)) out.push("verified_law_concept");
  if (hasGeneralKnowledgeSignals(ku, rr)) out.push("general_knowledge");
  if (hasLlmAuxiliarySignals(ku, rr)) out.push("llm_auxiliary");
  if (out.length === 0) {
    out.push("llm_auxiliary");
  }
  return Array.from(new Set(out));
}

export function mergeKnowledgePriorityV1(
  activeTiers: TenmonKnowledgeTierV1[],
): {
  primaryTier: TenmonKnowledgeTierV1;
  tensions: TenmonKnowledgeTensionV1[];
} {
  const primary = minTier(activeTiers) ?? "llm_auxiliary";
  const tensions: TenmonKnowledgeTensionV1[] = [];
  const pi = tierIndex(primary);
  for (const t of activeTiers) {
    if (t === primary) continue;
    if (tierIndex(t) > pi) {
      tensions.push({ suppressed: t, winner: primary, reason: "priority_merge_v1" });
    }
  }
  return { primaryTier: primary, tensions };
}

/** ku にのみ付与。routeReason / thoughtCoreSummary / responsePlan は変更しない。 */
export function attachKnowledgePriorityKernelToKuV1(ku: Record<string, unknown>, rawMessage: string): void {
  const active = collectActiveKnowledgeTiersV1(ku, rawMessage);
  const { primaryTier, tensions } = mergeKnowledgePriorityV1(active);
  (ku as Record<string, unknown>).knowledgePriorityKernelV1 = {
    version: 1,
    card: "TENMON_KNOWLEDGE_CIRCULATION_PRIORITY_KERNEL_CURSOR_AUTO_V1",
    tier_order: [...TENMON_KNOWLEDGE_TIER_ORDER_V1],
    active_tiers: active,
    primary_tier: primaryTier,
  };
  if (tensions.length > 0) {
    (ku as Record<string, unknown>).knowledgeTension = tensions;
  }
}
