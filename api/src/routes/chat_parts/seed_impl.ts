// seed_impl.ts
// X4_SEED_SAVE_SINGLEPOINT_V1
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import { getDbPath } from "../../db/index.js";
import { filterEvidenceIdsForKokuzoBadGuardV1 } from "../../kokuzo/kokuzoBadGuardEvidenceV1.js";

export function saveArkThreadSeedV1(payload: any): void {
  try {
    const df = payload?.decisionFrame;
    const ku = (df?.ku ?? {}) as any;
    const laws = Array.isArray(ku.lawsUsed) ? ku.lawsUsed : [];
    const eviRaw = Array.isArray(ku.evidenceIds) ? ku.evidenceIds : [];
    const { kept: evi } = filterEvidenceIdsForKokuzoBadGuardV1(eviRaw.map(String));
    if (laws.length === 0 || evi.length === 0) return;

    const seedId = crypto.createHash("sha256")
      .update(JSON.stringify(laws) + JSON.stringify(evi))
      .digest("hex")
      .slice(0, 24);

    const db = new DatabaseSync(getDbPath("kokuzo.sqlite"));
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO ark_thread_seeds
      (seedId, threadId, lawsUsedJson, evidenceIdsJson, heartJson, routeReason, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      seedId,
      String(payload?.threadId ?? ""),
      JSON.stringify(laws),
      JSON.stringify(evi),
      JSON.stringify(ku.heart ?? {}),
      String(ku.routeReason ?? ""),
      new Date().toISOString()
    );
  } catch (e) {
    // swallow: must never break chat
  }
}
