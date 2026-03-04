import { getDb } from "../../db/index.js";

export function recordLawUsage(threadId: string, lawKeys: string[]) {

  const db = getDb("kokuzo");

  const insert = db.prepare(`
    INSERT INTO khs_apply_log
    (applyId, createdAt, threadId, lawKey)
    VALUES (hex(randomblob(16)), datetime('now'), ?, ?)
  `);

  let count = 0;

  for (const k of lawKeys) {
    if (!k) continue;
    insert.run(threadId, k);
    count++;
  }

  return {
    usageRecorded: count
  };
}
