/**
 * CARD_THREADCORE_MIN_V1: thread ごとの最小 ThreadCore 型とヘルパー
 */

export type ThreadResponseContract = {
  answerLength?: "short" | "medium" | "long" | null;
  answerMode?: string | null;
  answerFrame?: string | null;
  routeReason?: string | null;
};

export type ThreadCore = {
  threadId: string;
  centerKey: string | null;
  centerLabel: string | null;
  activeEntities: string[];
  openLoops: string[];
  commitments: string[];
  lastResponseContract: ThreadResponseContract | null;
  updatedAt: string;
};

export function emptyThreadCore(threadId: string): ThreadCore {
  return {
    threadId,
    centerKey: null,
    centerLabel: null,
    activeEntities: [],
    openLoops: [],
    commitments: [],
    lastResponseContract: null,
    updatedAt: new Date().toISOString(),
  };
}

export function centerLabelFromKey(centerKey: string | null): string | null {
  const k = String(centerKey || "").trim().toLowerCase();
  if (!k) return null;
  if (k === "kotodama") return "言霊";
  if (k === "katakamuna") return "カタカムナ";
  if (k === "mizuhi" || k === "suika" || k === "mizuho" || k === "mizuho_den") return "水穂伝";
  if (k === "tenmon_ark") return "天聞アーク";
  return String(centerKey || "").trim() || null;
}
