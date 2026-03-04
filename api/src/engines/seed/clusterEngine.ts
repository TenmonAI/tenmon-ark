import { getDb } from "../../db/index.js";
import crypto from "node:crypto";

export function generateSeedClusters(limit = 100) {
  const db = getDb("kokuzo");

  const seeds = db.prepare(`
    SELECT seedKey, lawKey
    FROM khs_seeds_det_v1
    WHERE seedKey IS NOT NULL
    LIMIT ?
  `).all(limit);

  const insert = db.prepare(`
    INSERT OR IGNORE INTO khs_seed_clusters
    (clusterKey, representativeSeed, clusterSize, updatedAt)
    VALUES (?, ?, 1, datetime('now'))
  `);

  let created = 0;

  for (let i = 0; i < seeds.length; i++) {
    for (let j = i + 1; j < seeds.length; j++) {

      const key = crypto
        .createHash("sha1")
        .update(String(seeds[i].lawKey) + String(seeds[j].lawKey))
        .digest("hex");

      insert.run(key, seeds[i].seedKey);
      created++;
    }
  }

  return {
    clustersCreated: created
  };
}
