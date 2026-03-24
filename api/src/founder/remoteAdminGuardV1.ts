/**
 * TENMON_PARENT_06 — 管理者遠隔投入（chat 一般面と分離）
 * cursor autobuild / campaign / retry / maintenance / feature spec を型で分け、テキストは remote cursor ガードに通す。
 */

import { guardRemoteCursorPayload, type RemoteGuardOutcome } from "./remoteCursorGuardV1.js";

export const REMOTE_ADMIN_INTAKE_KINDS = [
  "cursor_autobuild_card",
  "multi_card_campaign",
  "retry_card",
  "maintenance_card",
  "feature_spec_card",
] as const;

export type RemoteAdminIntakeKind = (typeof REMOTE_ADMIN_INTAKE_KINDS)[number];

export type RemoteAdminCardSlice = {
  card_name: string;
  card_body_md: string;
};

export type RemoteAdminIntakePayload =
  | { kind: "cursor_autobuild_card"; card: RemoteAdminCardSlice; meta?: Record<string, unknown> }
  | { kind: "retry_card"; card: RemoteAdminCardSlice; meta?: Record<string, unknown> }
  | { kind: "maintenance_card"; card: RemoteAdminCardSlice; meta?: Record<string, unknown> }
  | { kind: "multi_card_campaign"; cards: RemoteAdminCardSlice[]; campaign_title?: string; meta?: Record<string, unknown> }
  | {
      kind: "feature_spec_card";
      intent_text: string;
      constraints?: string[];
      suggested_card_name?: string;
      meta?: Record<string, unknown>;
    };

export type GateSliceResult = {
  index: number;
  card_name: string;
  guard: RemoteGuardOutcome;
};

export type RemoteAdminGateSummary = {
  ok: boolean;
  rejected: boolean;
  any_high_risk: boolean;
  slices: GateSliceResult[];
  reject_reasons: string[];
};

/** ペイロードをカード断片に展開し、それぞれガード */
export function guardRemoteAdminIntakePayload(body: unknown): RemoteAdminGateSummary {
  const reject_reasons: string[] = [];
  const slices: GateSliceResult[] = [];
  let any_high_risk = false;

  if (!body || typeof body !== "object") {
    return {
      ok: false,
      rejected: true,
      any_high_risk: false,
      slices: [],
      reject_reasons: ["invalid_body"],
    };
  }

  const o = body as Record<string, unknown>;
  const kind = String(o.kind ?? "").trim() as RemoteAdminIntakeKind;

  if (!REMOTE_ADMIN_INTAKE_KINDS.includes(kind)) {
    return {
      ok: false,
      rejected: true,
      any_high_risk: false,
      slices: [],
      reject_reasons: [`unknown_kind:${kind || "empty"}`],
    };
  }

  const pushSlice = (idx: number, card_name: string, card_body_md: string) => {
    const g = guardRemoteCursorPayload(card_name, card_body_md);
    slices.push({ index: idx, card_name, guard: g });
    if (g.rejected) reject_reasons.push(...g.reject_reasons);
    if (g.risk_tier === "high") any_high_risk = true;
  };

  if (kind === "cursor_autobuild_card" || kind === "retry_card" || kind === "maintenance_card") {
    const card = o.card as Record<string, unknown> | undefined;
    const card_name = String(card?.card_name ?? "").trim();
    const card_body_md = String(card?.card_body_md ?? card?.body ?? "").trim();
    if (!card_name) reject_reasons.push("card.card_name required");
    pushSlice(0, card_name || "(empty)", card_body_md);
  } else if (kind === "multi_card_campaign") {
    const cards = o.cards;
    if (!Array.isArray(cards) || cards.length === 0) {
      reject_reasons.push("cards[] required");
    } else {
      cards.forEach((c, i) => {
        const row = (c ?? {}) as Record<string, unknown>;
        const card_name = String(row.card_name ?? "").trim();
        const card_body_md = String(row.card_body_md ?? row.body ?? "").trim();
        if (!card_name) reject_reasons.push(`cards[${i}].card_name required`);
        pushSlice(i, card_name || `(empty-${i})`, card_body_md);
      });
    }
  } else if (kind === "feature_spec_card") {
    const intent_text = String(o.intent_text ?? "").trim();
    const suggested = String(o.suggested_card_name ?? "TENMON_FEATURE_SPEC_INTENT_CURSOR_AUTO_V1").trim();
    if (!intent_text) reject_reasons.push("intent_text required");
    pushSlice(0, suggested, intent_text);
  }

  const rejected = slices.some((s) => s.guard.rejected) || reject_reasons.some((r) => r.endsWith("required"));
  return {
    ok: !rejected,
    rejected,
    any_high_risk,
    slices,
    reject_reasons,
  };
}
