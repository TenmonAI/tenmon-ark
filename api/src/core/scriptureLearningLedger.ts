import { getDbPath } from "../db/index.js";
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";

export type ScriptureLearningLedgerInput = {
  threadId: string;
  message: string;
  routeReason: string;
  scriptureKey?: string | null;
  subconceptKey?: string | null;
  conceptKey?: string | null;
  thoughtGuideKey?: string | null;
  personaConstitutionKey?: string | null;
  hasEvidence: boolean;
  hasLawTrace: boolean;
  resolvedLevel: "scripture" | "subconcept" | "concept" | "verified" | "general" | "unresolved";
  unresolvedNote?: string | null;
};

export function writeScriptureLearningLedger(entry: ScriptureLearningLedgerInput): void {
  try {
    const dbPath = getDbPath("kokuzo.sqlite");
    const db = new DatabaseSync(dbPath);
    const now = new Date().toISOString();
    const id =
      "LEDGER:" +
      now.replace(/[^0-9]/g, "").slice(0, 17) +
      ":" +
      crypto.randomBytes(6).toString("hex");

    const stmt = db.prepare(
      "INSERT OR IGNORE INTO scripture_learning_ledger(id, createdAt, threadId, message, routeReason, scriptureKey, subconceptKey, conceptKey, thoughtGuideKey, personaConstitutionKey, hasEvidence, hasLawTrace, resolvedLevel, unresolvedNote) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
    );
    stmt.run(
      id,
      now,
      String(entry.threadId || ""),
      String(entry.message || ""),
      String(entry.routeReason || ""),
      entry.scriptureKey || null,
      entry.subconceptKey || null,
      entry.conceptKey || null,
      entry.thoughtGuideKey || null,
      entry.personaConstitutionKey || null,
      entry.hasEvidence ? 1 : 0,
      entry.hasLawTrace ? 1 : 0,
      String(entry.resolvedLevel || "unresolved"),
      entry.unresolvedNote || null
    );
  } catch (e) {
    try {
      // Ledger failure must not break conversation
      console.error("[SCRIPTURE_LEARNING_LEDGER_FAIL]", e);
    } catch {
      // ignore
    }
  }
}

