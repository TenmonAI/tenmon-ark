import type { CorePlan } from "../kanagi/core/corePlan.js";

export type KokuzoRecallResult = {
  centerClaim: string;
  updatedAt: string;
  pages: any[];
  laws: any[];
  source_priority: "core_scripture" | "notion" | "nas" | "general";
  provenance: {
    doc: string;
    page?: number;
    source_kind: string;
    confidence: "verified" | "probable" | "inferred";
  }[];
};

type RecallState = {
  centerClaim: string;
  updatedAt: string;
  pages: any[];
  laws: any[];
  source_priority: KokuzoRecallResult["source_priority"];
  provenance: KokuzoRecallResult["provenance"];
};
const mem = new Map<string, RecallState>();

export function getSourcePriority(doc: string): KokuzoRecallResult["source_priority"] {
  const d = String(doc || "").toUpperCase();
  if (/KHS|LOTUS|KATAKAMUNA|IROHA|KUKAI|KOJIKI|MIZUHO/.test(d)) return "core_scripture";
  if (/NOTION/.test(d)) return "notion";
  if (/NAS/.test(d)) return "nas";
  return "general";
}

export function kokuzoRecall(threadId: string): KokuzoRecallResult | null {
  return mem.get(threadId) ?? null;
}

export function kokuzoRemember(threadId: string, plan: CorePlan): void {
  const evidenceIds = Array.isArray((plan as any)?.evidenceIds) ? (plan as any).evidenceIds : [];
  const candidates = Array.isArray((plan as any)?.candidates) ? (plan as any).candidates : [];
  const pages = candidates.slice(0, 5);
  const laws = Array.isArray((plan as any)?.lawCandidates) ? (plan as any).lawCandidates : [];

  let topDoc = "";
  if (evidenceIds.length > 0) {
    const first = String(evidenceIds[0] ?? "");
    const m = first.match(/^KZPAGE:([^:]+):P\d+/);
    if (m?.[1]) topDoc = m[1];
  }
  if (!topDoc && pages[0]?.doc) topDoc = String(pages[0].doc);

  const source_priority = getSourcePriority(topDoc);
  const provenance: KokuzoRecallResult["provenance"] = [];
  if (topDoc) {
    let topPage: number | undefined;
    if (pages[0]?.pdfPage != null) {
      const n = Number(pages[0].pdfPage);
      topPage = Number.isFinite(n) ? n : undefined;
    }
    provenance.push({
      doc: topDoc,
      page: topPage,
      source_kind: source_priority,
      confidence: evidenceIds.length > 0 ? "verified" : "probable",
    });
  } else {
    provenance.push({
      doc: "unknown",
      source_kind: "general",
      confidence: "inferred",
    });
  }

  mem.set(threadId, {
    centerClaim: String(plan.centerClaim || ""),
    updatedAt: new Date().toISOString(),
    pages,
    laws,
    source_priority,
    provenance,
  });
}
