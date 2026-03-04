import crypto from "node:crypto";
import { getDb } from "../../db/index.js";

export function generateSeedsFromKHS(limit = 200) {
  const db = getDb("kokuzo");

  const rows = db.prepare(`
    SELECT unitId, quoteHash
    FROM khs_units
    LIMIT ?
  `).all(limit);

  const insert = db.prepare(`
    INSERT OR IGNORE INTO khs_seeds_det_v1
    (seedKey, unitId, lawKey, quoteHash, quoteLen, createdAt)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);

  let count = 0;

  for (const r of rows) {
    const seedKey = crypto
      .createHash("sha256")
      .update(String(r.unitId) + String(r.quoteHash))
      .digest("hex")
      .slice(0, 24);

    insert.run(
      seedKey,
      r.unitId,
      "",
      r.quoteHash,
      0
    );

    count++;
  }

  return {
    seedsCreated: count
  };
}
