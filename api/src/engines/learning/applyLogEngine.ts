import { getDb } from "../../db/index.js";

export function recordLawUsage(threadId: string, lawKeys: string[]) {

  const db = getDb("kokuzo");

  const now = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO khs_apply_log
    (applyId, createdAt, threadId, lawKey)
    VALUES (hex(randomblob(16)), ?, ?, ?)
  `);

  let count = 0;

  for (const k of lawKeys) {
    if (!k) continue;
    insert.run(now, threadId, k);
    count++;
  }

  return {
    usageRecorded: count
  };
}
