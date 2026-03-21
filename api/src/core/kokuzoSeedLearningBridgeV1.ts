/**
 * KOKUZO_SEED_LEARNING_BRIDGE_V1
 * khsCandidates（KOKUZO/HST 系）を thought / binder / sourceStack へ橋渡しする。
 * lawKey を本文・人間可読ラベルに増やさない（件数・素材ヒントのみ）。
 */
const BRIDGE_V = "kokuzo_seed_bridge_v1";

function safeCandidates(df: Record<string, unknown> | null | undefined): unknown[] {
  try {
    const dp = (df as any)?.detailPlan;
    const raw = dp?.khsCandidates;
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

/** @returns true if bridge 適用 */
export function applyKokuzoSeedLearningBridgeV1(payload: Record<string, unknown> | null | undefined): boolean {
  if (!payload || typeof payload !== "object") return false;
  const df = payload.decisionFrame;
  if (!df || typeof df !== "object") return false;
  const ku = (df as any).ku;
  if (!ku || typeof ku !== "object" || Array.isArray(ku)) return false;

  const cands = safeCandidates(df as Record<string, unknown>);
  if (cands.length === 0) return false;

  const n = Math.min(99, cands.length);
  const first = cands[0] as Record<string, unknown> | undefined;
  const hintRaw = String(first?.kanji2Top ?? first?.quote ?? "").replace(/\s+/g, " ").trim();
  const hint = hintRaw.slice(0, 48);

  ku.thoughtCoreSummary =
    typeof ku.thoughtCoreSummary === "object" && ku.thoughtCoreSummary && !Array.isArray(ku.thoughtCoreSummary)
      ? { ...ku.thoughtCoreSummary }
      : {};
  const tcs = ku.thoughtCoreSummary as Record<string, unknown>;
  const existing = String(tcs.kokuzoSeedBridgeNote ?? "").trim();
  if (!existing) {
    tcs.kokuzoSeedBridgeNote =
      `虚空蔵（KOKUZO）から意味単位の素材を ${n} 件参照し、思考の芯を補強しています（法則キーは内部管理のままです）。`;
  }
  tcs.kokuzoSeedBridge = BRIDGE_V;

  ku.sourceStackSummary =
    typeof ku.sourceStackSummary === "object" && ku.sourceStackSummary && !Array.isArray(ku.sourceStackSummary)
      ? { ...ku.sourceStackSummary }
      : {};
  const ss = ku.sourceStackSummary as Record<string, unknown>;
  const tg0 = String(ss.thoughtGuideSummary ?? "").trim();
  const add = hint ? ` KOKUZO 素材の手がかり: 「${hint.replace(/"/g, "")}…」` : "";
  ss.thoughtGuideSummary = (tg0 + add).trim().slice(0, 520);
  const sk = ss.sourceKinds;
  const arr = Array.isArray(sk) ? [...sk] : [];
  if (!arr.includes("kokuzo_seed_material_v1")) arr.push("kokuzo_seed_material_v1");
  ss.sourceKinds = arr;
  ss.kokuzoBridgePath = "quarantine_guarded";
  if (!String(ku.sourcePack ?? "").trim()) {
    (ku as Record<string, unknown>).sourcePack = "kokuzo_quarantine_guarded_v1";
  }

  if (typeof ku.binderSummary === "string") {
    const s = String(ku.binderSummary).trim();
    ku.binderSummary = {
      note: s,
      kokuzoBridge: BRIDGE_V,
    };
  } else if (ku.binderSummary && typeof ku.binderSummary === "object" && !Array.isArray(ku.binderSummary)) {
    (ku.binderSummary as Record<string, unknown>).kokuzoBridge = BRIDGE_V;
  } else {
    ku.binderSummary = { kokuzoBridge: BRIDGE_V };
  }

  const sk0 = ku.seedKernel && typeof ku.seedKernel === "object" && !Array.isArray(ku.seedKernel) ? ku.seedKernel : {};
  ku.seedKernel = {
    ...sk0,
    kokuzoBridgeV1: { active: true, materialCount: n },
  };

  return true;
}
