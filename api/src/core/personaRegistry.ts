import { randomUUID } from "node:crypto";
import { dbPrepare } from "../db/index.js";

type PersonaProfileRow = {
  id: string;
  slug: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

const selectPreferredPersonaStmt = dbPrepare(
  "kokuzo",
  "SELECT id, slug FROM persona_profiles WHERE slug = ? LIMIT 1"
);

const selectFallbackPersonaStmt = dbPrepare(
  "kokuzo",
  "SELECT id, slug FROM persona_profiles ORDER BY created_at ASC LIMIT 1"
);

const insertThreadPersonaLinkStmt = dbPrepare(
  "kokuzo",
  "INSERT OR IGNORE INTO thread_persona_links (id, thread_id, persona_id, link_mode, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
);

export function ensureThreadPersonaAutoLinkV1(threadId: string): void {
  const tid = String(threadId ?? "").trim();
  if (!tid) return;

  const preferred = selectPreferredPersonaStmt.get("kukai-deepread") as PersonaProfileRow | undefined;
  const fallback = preferred ?? (selectFallbackPersonaStmt.get() as PersonaProfileRow | undefined);
  if (!fallback?.id) return;

  const now = nowIso();
  insertThreadPersonaLinkStmt.run(randomUUID(), tid, fallback.id, "auto_default", now, now);
}

export function ensureThreadPersonaAutoLink(threadId: string): void {
  ensureThreadPersonaAutoLinkV1(threadId);
}

