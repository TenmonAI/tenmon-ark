import { getDb } from "../../db/index.js";

export function evaluateReward(entropy: number, clarity: number, resolution: number): number {
  return (
    clarity * 0.5 +
    resolution * 0.3 -
    entropy * 0.2
  );
}

export function updateConceptWeight(concept: string, reward: number): void {
  const db = getDb("audit");
  const now = Date.now();

  const row = db.prepare(`
    SELECT weight FROM concept_weights
    WHERE concept = ?
  `).get(concept) as { weight: number } | undefined;

  if (!row) {
    db.prepare(`
      INSERT INTO concept_weights (concept, weight, updatedAt)
      VALUES (?, ?, ?)
    `).run(concept, reward, now);
    return;
  }

  const newWeight = (row.weight ?? 0) + reward;

  db.prepare(`
    UPDATE concept_weights
    SET weight = ?, updatedAt = ?
    WHERE concept = ?
  `).run(newWeight, now, concept);
}
