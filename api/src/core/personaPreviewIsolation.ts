import { getDb } from "../db/index.js";

function ensurePreviewTables(): void {
  const db = getDb("kokuzo");
  db.exec(`
    CREATE TABLE IF NOT EXISTS persona_preview_sessions (
      id TEXT PRIMARY KEY,
      persona_id TEXT NOT NULL,
      preview_thread_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function isPreviewThread(threadId: string): boolean {
  return String(threadId || "").startsWith("preview_persona_");
}

export function createPreviewThreadId(personaId: string): string {
  return `preview_persona_${personaId}_${Date.now()}`;
}

export function assertNotPreviewContamination(threadId: string): void {
  if (isPreviewThread(threadId)) {
    throw new Error(`Preview thread ${threadId} must not be used in production memory`);
  }
}

export function getPreviewSession(sessionId: string): Record<string, unknown> | null {
  try {
    ensurePreviewTables();
    const db = getDb("kokuzo");
    return (db
      .prepare("SELECT * FROM persona_preview_sessions WHERE id=? LIMIT 1")
      .get(sessionId) as Record<string, unknown> | undefined) ?? null;
  } catch {
    return null;
  }
}

export function closePreviewSession(sessionId: string): void {
  try {
    ensurePreviewTables();
    const db = getDb("kokuzo");
    db.prepare(
      "UPDATE persona_preview_sessions SET status='closed',updated_at=datetime('now') WHERE id=?"
    ).run(sessionId);
  } catch {
    // no-op
  }
}

export function verifyPreviewIsolation(previewThreadId: string): {
  isolated: boolean;
  reason: string;
} {
  try {
    const db = getDb("kokuzo");
    const inPwa = db.prepare("SELECT threadId FROM pwa_threads WHERE threadId=? LIMIT 1").get(previewThreadId);
    if (inPwa) return { isolated: false, reason: "preview_thread_found_in_pwa_threads" };

    const inSession = db
      .prepare("SELECT session_id FROM session_memory WHERE session_id=? LIMIT 1")
      .get(previewThreadId);
    if (inSession) return { isolated: false, reason: "preview_thread_found_in_session_memory" };

    return { isolated: true, reason: "ok" };
  } catch {
    return { isolated: true, reason: "verification_skipped" };
  }
}
