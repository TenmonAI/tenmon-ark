/**
 * TENMON_R1_20A — P20 / HYBRID detailPlan 契約（contract-first）。
 * CorePlan を拡張し、会話器出口で常に object + 必須キーを保証する。
 */
import { emptyCorePlan, type CorePlan } from "../kanagi/core/corePlan.js";

/** CorePlan 以外に現行ルートが載せうるフィールド（すべて optional） */
export type DetailPlanContractP20ExtensionsV1 = {
  debug?: Record<string, unknown>;
  khsCandidates?: unknown[];
  routeReason?: string;
  input?: string;
  injections?: Record<string, unknown> & { trainingRules?: unknown[] };
  appliedRulesCount?: number;
  lawCandidates?: unknown[];
  kojikiTags?: unknown[];
  mythMapEdges?: unknown[];
  /** HYBRID: khsCandidates と同一根拠の参照スロット（KG2） */
  evidence?: unknown;
  /** repo-aware engineering sovereign loop */
  repoAwarePlan?: Record<string, unknown>;
  likelyFiles?: string[];
  impactSurface?: string[];
  acceptancePlan?: string[];
  riskMap?: string[];
  minimalDiffStrategy?: string;
  /** meaning owner route を保持（explicit は modifier として扱う） */
  ownerRouteReason?: string;
  /** formatting modifier 観測 */
  explicitLengthRequested?: number | null;
  answerLengthBias?: "short" | "medium" | "long" | null;
};

export type DetailPlanContractP20V1 = CorePlan & DetailPlanContractP20ExtensionsV1;

export function createEmptyDetailPlanP20V1(centerClaim = ""): DetailPlanContractP20V1 {
  const base = emptyCorePlan(centerClaim);
  return {
    ...base,
    khsCandidates: [],
    debug: {},
  };
}

/**
 * ゲート直前の payload に対し、top-level / decisionFrame.detailPlan を同一参照で object 化し、
 * chainOrder / warnings / khsCandidates 等を配列に正規化する（レス契約用）。
 */
export function ensureDetailPlanContractP20OnGatePayloadV1(payload: unknown): void {
  try {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;
    const p = payload as Record<string, unknown>;
    let df = p.decisionFrame as Record<string, unknown> | undefined;
    if (!df || typeof df !== "object" || Array.isArray(df)) {
      df = { mode: "NATURAL", intent: "chat", llm: null, ku: {} };
      p.decisionFrame = df;
    }
    const df2 = df as Record<string, unknown>;

    let plan: DetailPlanContractP20V1 | null = null;
    const dfdp = df2.detailPlan;
    const top = p.detailPlan;
    if (dfdp != null && typeof dfdp === "object" && !Array.isArray(dfdp)) {
      plan = dfdp as DetailPlanContractP20V1;
      p.detailPlan = plan;
    } else if (top != null && typeof top === "object" && !Array.isArray(top)) {
      plan = top as DetailPlanContractP20V1;
      df2.detailPlan = plan;
    } else {
      plan = createEmptyDetailPlanP20V1("");
      p.detailPlan = plan;
      df2.detailPlan = plan;
    }

    if (!plan || typeof plan !== "object" || Array.isArray(plan)) return;

    if (!Array.isArray(plan.chainOrder)) plan.chainOrder = [];
    if (!Array.isArray(plan.warnings)) plan.warnings = [];
    if (!Array.isArray(plan.evidenceIds)) plan.evidenceIds = [];
    if (!Array.isArray(plan.claims)) plan.claims = [];
    if (plan.centerClaim == null || typeof plan.centerClaim !== "string") {
      plan.centerClaim = String(plan.centerClaim ?? "");
    }
    if (!Array.isArray(plan.khsCandidates)) plan.khsCandidates = [];

    const ku = df2.ku as Record<string, unknown> | undefined;
    const mode = String(df2.mode ?? "");
    const rr = ku && typeof ku.routeReason === "string" ? ku.routeReason.trim() : "";
    if (mode === "HYBRID" && rr) {
      if (!plan.routeReason || !String(plan.routeReason).trim()) {
        plan.routeReason = rr;
      }
    }

    const dbg =
      plan.debug && typeof plan.debug === "object" && !Array.isArray(plan.debug)
        ? { ...plan.debug }
        : {};
    dbg.detailPlanContractR1 = "20A_V1";
    if (mode === "HYBRID") {
      dbg.detailPlanContract = "P20_HYBRID_R1_20A_V1";
    }
    plan.debug = dbg;

    p.detailPlan = plan;
    df2.detailPlan = plan;
  } catch {
    /* R1_20A: ゲートは落とさない */
  }
}
