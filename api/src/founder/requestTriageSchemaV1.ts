/**
 * REQUEST_TRIAGE_SCHEMA_V1 — Founder 要望の型（カテゴリ）を固定する。
 * runtime の DB スキーマ変更は行わない（JSONL 行に category を載せる）。
 */
export const FOUNDER_REQUEST_TRIAGE_CATEGORIES = ["bug", "quality", "feature", "research", "rejected"] as const;
export type FounderRequestTriageCategory = (typeof FOUNDER_REQUEST_TRIAGE_CATEGORIES)[number];

export type ParseFounderRequestResult =
  | { ok: true; text: string; category: FounderRequestTriageCategory; source: string; meta: Record<string, unknown> }
  | { ok: false; errors: string[] };

function isCategory(x: string): x is FounderRequestTriageCategory {
  return (FOUNDER_REQUEST_TRIAGE_CATEGORIES as readonly string[]).includes(x);
}

/** POST body: { text | message, category?, source?, meta? } */
export function parseFounderRequestPayload(body: unknown): ParseFounderRequestResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, errors: ["body_must_be_object"] };
  }
  const b = body as Record<string, unknown>;
  const text = String(b.text ?? b.message ?? "").trim();
  if (!text) return { ok: false, errors: ["text_required"] };

  const rawCat = b.category != null && b.category !== "" ? String(b.category).trim() : "";
  let category: FounderRequestTriageCategory = "quality";
  if (rawCat) {
    if (!isCategory(rawCat)) return { ok: false, errors: ["invalid_category"] };
    category = rawCat;
  }

  const source = b.source != null ? String(b.source).slice(0, 120) : "founder_request_box";
  const meta =
    b.meta && typeof b.meta === "object" && !Array.isArray(b.meta) ? (b.meta as Record<string, unknown>) : {};

  return { ok: true, text, category, source, meta };
}
