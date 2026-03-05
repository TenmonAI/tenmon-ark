import { getDb } from "../../db/index.js";

export function runTrainer(limit = 100) {

  const db = getDb("kokuzo");

  const rows = db.prepare(`
    SELECT lawKey, COUNT(*) as usage
    FROM khs_apply_log
    GROUP BY lawKey
    ORDER BY usage DESC
    LIMIT ?
  `).all(limit);

  const update = db.prepare(`
    UPDATE khs_concepts
    SET conceptWeight = conceptWeight + ?
    WHERE clusterKey IN (
      SELECT clusterKey
      FROM khs_seed_clusters
      WHERE representativeSeed IN (
        SELECT seedKey
        FROM khs_seeds_det_v1
        WHERE lawKey = ?
      )
    )
  `);

  let updated = 0;

  for (const r of rows) {

    update.run(
      r.usage,
      r.lawKey
    );

    updated++;
  }

  return {
    conceptsUpdated: updated
  };

}
