/**
 * TENMON_THREAD_MEANING_MEMORY_CURSOR_AUTO_V1
 * 裁定 coreTruth をスレッド単位の意味中心として runtime 保持（表層には出さない）
 */

import type { TruthLayerArbitrationResultV1 } from "./meaningArbitrationKernel.js";
import type { InputSemanticSplitResultV1 } from "./inputSemanticSplitter.js";

/** スレッド意味中心（既存 ThreadCore 型名と衝突させない strict 契約） */
export type ThreadMeaningMemoryCoreV1 = {
  schema: "TENMON_THREAD_MEANING_MEMORY_V1";
  priorCenter: string | null;
  currentCenter: string | null;
  /** 直近ターンの centerKey（話題飛躍判定用・表層非表示） */
  lastCenterKey: string | null;
  delta: string | null;
  nextStepBias: string | null;
  acceptedConcepts: readonly string[];
  unresolvedAxes: readonly string[];
  detach: boolean;
};

export function emptyThreadMeaningMemoryCoreV1(): ThreadMeaningMemoryCoreV1 {
  return {
    schema: "TENMON_THREAD_MEANING_MEMORY_V1",
    priorCenter: null,
    currentCenter: null,
    lastCenterKey: null,
    delta: null,
    nextStepBias: null,
    acceptedConcepts: [],
    unresolvedAxes: [],
    detach: false,
  };
}

/** general / continuity / scripture follow-up など（特殊系 DEF/EXPLICIT/SYSTEM_DIAG は除外） */
export function threadMeaningMemoryRouteAllowedV1(routeReason: string): boolean {
  const rr = String(routeReason || "").trim();
  if (rr === "NATURAL_GENERAL_LLM_TOP_V1") return true;
  if (rr === "TENMON_SCRIPTURE_CANON_V1") return true;
  if (rr === "TENMON_SUBCONCEPT_CANON_V1") return true;
  if (rr.startsWith("CONTINUITY_")) return true;
  if (/^R22_(ESSENCE|NEXTSTEP|COMPARE)_FOLLOWUP_V1$/.test(rr)) return true;
  return false;
}

const RE_CONNECT_SURFACE = /続き|前の|さっき|先ほど|直前|その返答|同じ話|引き続き|継続|流れで|その流れ|要点を/u;

function readSplit(ku: Record<string, unknown>): InputSemanticSplitResultV1 | null {
  const s = ku.inputSemanticSplitResultV1;
  if (!s || typeof s !== "object" || Array.isArray(s)) return null;
  if ((s as { schema?: string }).schema !== "TENMON_INPUT_SEMANTIC_SPLIT_V1") return null;
  return s as InputSemanticSplitResultV1;
}

function readTruth(ku: Record<string, unknown>): TruthLayerArbitrationResultV1 | null {
  const t = ku.truthLayerArbitrationV1;
  if (!t || typeof t !== "object" || Array.isArray(t)) return null;
  if ((t as { schema?: string }).schema !== "TENMON_TRUTH_LAYER_ARBITRATION_V1") return null;
  return t as TruthLayerArbitrationResultV1;
}

function tokenOverlap(message: string, anchor: string): number {
  const msg = message.slice(0, 280);
  const parts = anchor.split(/[\s、。．]+/u).filter((x) => x.length >= 2);
  let n = 0;
  for (const p of parts.slice(0, 8)) {
    if (msg.includes(p)) n++;
  }
  if (parts.length === 0 && anchor.length >= 2) {
    const head = anchor.slice(0, Math.min(12, anchor.length));
    return msg.includes(head) ? 1 : 0;
  }
  return n;
}

function detectDetach(args: {
  rawMessage: string;
  prior: ThreadMeaningMemoryCoreV1;
  newCenterLabel: string | null;
  newCenterKey: string | null;
  connectIntent: boolean;
}): boolean {
  if (args.connectIntent) return false;
  const prev = args.prior.currentCenter?.trim() || args.prior.priorCenter?.trim();
  if (!prev) return false;
  const pk = args.prior.lastCenterKey?.trim() || null;
  const nk = args.newCenterKey?.trim() || null;
  if (nk && pk && nk !== pk) return true;
  const msg = args.rawMessage.trim();
  if (tokenOverlap(msg, prev) > 0) return false;
  return msg.length > 8;
}

const MAX_CONCEPTS = 16;

function mergeConcepts(
  detach: boolean,
  prev: readonly string[],
  label: string | null,
  arbitration: TruthLayerArbitrationResultV1 | null,
): string[] {
  const add =
    label?.trim() ||
    (arbitration?.answerMode === "canon_grounded" ? arbitration.coreTruth.slice(0, 48).trim() : "");
  if (detach) {
    return add ? [add] : [];
  }
  const out = [...prev.map((x) => String(x).trim()).filter(Boolean)];
  if (add && !out.includes(add)) out.unshift(add);
  return out.slice(0, MAX_CONCEPTS);
}

export type ThreadMeaningMemoryCarryTargetV1 = {
  centerKey?: string | null;
  centerLabel?: string | null;
  threadMeaningMemoryV1?: ThreadMeaningMemoryCoreV1 | null;
};

/**
 * binder 適用後: ku + threadCore に threadMeaningMemoryV1 を載せる（内部観測のみ）
 */
export function advanceThreadMeaningMemoryForRequestV1(args: {
  ku: Record<string, unknown>;
  threadCore: ThreadMeaningMemoryCarryTargetV1;
  rawMessage: string;
}): void {
  const { ku, threadCore } = args;
  const rawMessage = String(args.rawMessage || "").trim();
  const rr = String(ku.routeReason ?? "").trim();
  if (!threadMeaningMemoryRouteAllowedV1(rr)) return;

  const prior = threadCore.threadMeaningMemoryV1 ?? emptyThreadMeaningMemoryCoreV1();
  const split = readSplit(ku);
  const arbitration = readTruth(ku);
  const centerKey = ku.centerKey != null ? String(ku.centerKey).trim() || null : null;
  const centerLabel = ku.centerLabel != null ? String(ku.centerLabel).trim() || null : null;

  const connectIntent =
    RE_CONNECT_SURFACE.test(rawMessage) || (split != null && split.intentClass === "connect");

  const currentCenter =
    centerLabel ||
    centerKey ||
    (arbitration ? arbitration.coreTruth.slice(0, 120).trim() || null : null);

  const detach = detectDetach({
    rawMessage,
    prior,
    newCenterLabel: centerLabel,
    newCenterKey: centerKey,
    connectIntent,
  });

  const priorCenter = detach ? null : prior.currentCenter;
  const delta = detach
    ? "detached_fresh_topic"
    : prior.currentCenter && currentCenter && prior.currentCenter === currentCenter
      ? "same_center_continuation"
      : prior.currentCenter
        ? "center_shift"
        : "initial_center";

  const nextStepBias = arbitration
    ? `lane:${arbitration.answerMode}${arbitration.danshari ? "|danshari" : ""}`
    : centerKey
      ? `centerKey:${centerKey}`
      : "open";

  const unresolvedAxes = arbitration
    ? [...arbitration.forbidFlags, ...arbitration.droppedCandidates].slice(0, 8)
    : [];

  const acceptedConcepts = mergeConcepts(detach, prior.acceptedConcepts, centerLabel, arbitration);

  const next: ThreadMeaningMemoryCoreV1 = {
    schema: "TENMON_THREAD_MEANING_MEMORY_V1",
    priorCenter,
    currentCenter,
    lastCenterKey: centerKey,
    delta,
    nextStepBias,
    acceptedConcepts,
    unresolvedAxes,
    detach,
  };

  (ku as Record<string, unknown>).threadMeaningMemoryV1 = next;
  threadCore.threadMeaningMemoryV1 = next;
}

/** center_reason JSON からの復元（厳密 schema のみ） */
export function parseThreadMeaningMemoryV1FromJson(raw: unknown): ThreadMeaningMemoryCoreV1 | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (String(o.schema || "") !== "TENMON_THREAD_MEANING_MEMORY_V1") return null;
  const acceptedConcepts = Array.isArray(o.acceptedConcepts)
    ? (o.acceptedConcepts as unknown[]).map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  const unresolvedAxes = Array.isArray(o.unresolvedAxes)
    ? (o.unresolvedAxes as unknown[]).map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  return {
    schema: "TENMON_THREAD_MEANING_MEMORY_V1",
    priorCenter: o.priorCenter != null ? String(o.priorCenter).trim() || null : null,
    currentCenter: o.currentCenter != null ? String(o.currentCenter).trim() || null : null,
    lastCenterKey: o.lastCenterKey != null ? String(o.lastCenterKey).trim() || null : null,
    delta: o.delta != null ? String(o.delta).trim() || null : null,
    nextStepBias: o.nextStepBias != null ? String(o.nextStepBias).trim() || null : null,
    acceptedConcepts: acceptedConcepts.slice(0, MAX_CONCEPTS),
    unresolvedAxes: unresolvedAxes.slice(0, 16),
    detach: o.detach === true,
  };
}

/** saveThreadCore 用に JSON へ載せるプレーンオブジェクト */
export function serializeThreadMeaningMemoryV1ForStore(m: ThreadMeaningMemoryCoreV1): Record<string, unknown> {
  return {
    schema: m.schema,
    priorCenter: m.priorCenter,
    currentCenter: m.currentCenter,
    lastCenterKey: m.lastCenterKey,
    delta: m.delta,
    nextStepBias: m.nextStepBias,
    acceptedConcepts: [...m.acceptedConcepts],
    unresolvedAxes: [...m.unresolvedAxes],
    detach: m.detach,
  };
}
