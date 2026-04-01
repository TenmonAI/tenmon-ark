import { getDb } from "../db/index.js";

export type PersonaStatus = "draft" | "testing" | "active" | "archived";

export interface PersonaProfile {
  id: string;
  slug: string;
  name: string;
  status: PersonaStatus;
  role_summary?: string;
  system_mantra?: string;
  mission?: string;
  answer_contract?: string;
  forbidden_behaviors_json?: string;
  tone?: string;
  strictness?: number;
  creativity?: number;
  memory_inheritance_mode?: string;
  retrieval_mode?: string;
  evidence_threshold?: number;
  hallucination_fallback?: string;
  preview_isolation?: number;
}

function ensurePersonaTables(): void {
  const db = getDb("kokuzo");
  db.exec(`
    CREATE TABLE IF NOT EXISTS persona_profiles (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      role_summary TEXT,
      system_mantra TEXT,
      mission TEXT,
      answer_contract TEXT,
      forbidden_behaviors_json TEXT,
      tone TEXT,
      strictness REAL,
      creativity REAL,
      memory_inheritance_mode TEXT,
      retrieval_mode TEXT,
      evidence_threshold REAL,
      hallucination_fallback TEXT,
      preview_isolation INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS thread_persona_links (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      persona_id TEXT NOT NULL,
      link_mode TEXT NOT NULL DEFAULT 'fixed',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function getPersonaById(id: string): PersonaProfile | null {
  try {
    ensurePersonaTables();
    const db = getDb("kokuzo");
    return (db
      .prepare("SELECT * FROM persona_profiles WHERE id=? LIMIT 1")
      .get(id) as PersonaProfile | undefined) ?? null;
  } catch {
    return null;
  }
}

export function getPersonaBySlug(slug: string): PersonaProfile | null {
  try {
    ensurePersonaTables();
    const db = getDb("kokuzo");
    return (db
      .prepare("SELECT * FROM persona_profiles WHERE slug=? LIMIT 1")
      .get(slug) as PersonaProfile | undefined) ?? null;
  } catch {
    return null;
  }
}

export function getActivePersonas(): PersonaProfile[] {
  try {
    ensurePersonaTables();
    const db = getDb("kokuzo");
    return db
      .prepare("SELECT * FROM persona_profiles WHERE status='active' ORDER BY COALESCE(updated_at, created_at) DESC")
      .all() as PersonaProfile[];
  } catch {
    return [];
  }
}

export function isPersonaActive(id: string): boolean {
  const p = getPersonaById(id);
  return p?.status === "active";
}

export function getPersonaForThread(threadId: string): PersonaProfile | null {
  try {
    ensurePersonaTables();
    const db = getDb("kokuzo");
    const link = db
      .prepare(
        "SELECT persona_id FROM thread_persona_links WHERE thread_id=? AND link_mode IN ('fixed','preview') ORDER BY created_at DESC LIMIT 1"
      )
      .get(threadId) as { persona_id?: string } | undefined;
    if (!link?.persona_id) return null;
    return getPersonaById(link.persona_id);
  } catch {
    return null;
  }
}
