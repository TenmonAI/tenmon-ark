import { getDb } from "../../db/index.js";
import crypto from "node:crypto";

export function generateConcepts(limit = 500) {

  const db = getDb("kokuzo");

  const rows = db.prepare(`
    SELECT clusterKey, representativeSeed, clusterSize
    FROM khs_seed_clusters
    ORDER BY clusterSize DESC
    LIMIT ?
  `).all(limit);

  const insert = db.prepare(`
    INSERT OR IGNORE INTO khs_concepts
    (conceptKey, clusterKey, conceptWeight, createdAt)
    VALUES (?, ?, ?, ?)
  `);

  const now = new Date().toISOString();

  let created = 0;

  for (const r of rows) {

    const conceptKey = crypto
      .createHash("sha1")
      .update(String(r.clusterKey))
      .digest("hex");

    insert.run(
      conceptKey,
      r.clusterKey,
      r.clusterSize,
      now
    );

    created++;
  }

  return {
    conceptsCreated: created
  };

}
