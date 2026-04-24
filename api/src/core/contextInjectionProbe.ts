/**
 * CARD-MC-16-V2: prompt 注入層の観測専用（response / LLM プロンプト本文には載せない）。
 * req.context.__debug_injections にメタデータのみ格納し、任意でプロセス最後尾スナップショットを更新する。
 */
import type { Request } from "express";

export type ContextInjectionProbeSlotV1 =
  | "inject_kotodama_hisho"
  | "inject_iroha"
  | "inject_kotodama_genten"
  | "inject_unified_sound"
  | "inject_amaterasu_axis"
  | "inject_kotodama_connector"
  | "inject_kotodama_one_sound_law"
  | "inject_truth_axis";

export type ContextInjectionLastSnapshotV1 = {
  ok: true;
  captured_at: string;
  threadId: string;
  injections: Record<string, unknown>;
} | { ok: false; reason: "no_capture_yet" };

const PREVIEW_MAX = 160;

let lastSnapshot: ContextInjectionLastSnapshotV1 = { ok: false, reason: "no_capture_yet" };

function clipPreview(s: string, max = PREVIEW_MAX): string {
  const t = String(s ?? "");
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/** production 既定 OFF。TENMON_MC_DEBUG_INJECTION_ENDPOINT=1 のときのみ GET エンドポイントを有効化。 */
export function isMcDebugInjectionEndpointEnabledV1(): boolean {
  return String(process.env.TENMON_MC_DEBUG_INJECTION_ENDPOINT ?? "").trim() === "1";
}

export function getLastContextInjectionSnapshotV1(): ContextInjectionLastSnapshotV1 {
  return lastSnapshot;
}

function attachContext(req: Request, mutator: (ctx: Record<string, unknown>) => void): void {
  const r = req as Request & { context?: Record<string, unknown> };
  const base = { ...(r.context && typeof r.context === "object" ? r.context : {}) };
  mutator(base);
  r.context = base;
}

/** 魂の根幹注入ブロックの直前で 1 回呼ぶ（同一リクエスト内の累積をリセット）。 */
export function resetContextInjectionProbeForRequestV1(req: Request): void {
  attachContext(req, (ctx) => {
    ctx.__debug_injections = {};
  });
}

export function recordContextInjectionProbeV1(
  req: Request,
  slot: ContextInjectionProbeSlotV1,
  meta: Record<string, unknown>,
): void {
  const payload = { ...meta, _recorded_at: new Date().toISOString() };
  attachContext(req, (ctx) => {
    const inj =
      ctx.__debug_injections && typeof ctx.__debug_injections === "object"
        ? (ctx.__debug_injections as Record<string, unknown>)
        : {};
    inj[slot] = payload;
    ctx.__debug_injections = inj;
  });
  const r = req as Request & { context?: Record<string, unknown>; body?: { threadId?: string } };
  const threadId = String(r.body?.threadId ?? "default");
  const injOut =
    r.context && typeof r.context.__debug_injections === "object"
      ? { ...(r.context.__debug_injections as Record<string, unknown>) }
      : {};
  lastSnapshot = {
    ok: true,
    captured_at: new Date().toISOString(),
    threadId,
    injections: injOut,
  };
}

export function buildInjectionPreviewV1(clause: string): string {
  return clipPreview(String(clause ?? ""));
}
