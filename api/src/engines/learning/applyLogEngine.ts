import { getDb } from "../../db/index.js";

export function recordLawUsage(threadId: string, lawKeys: string[]) {

  const db = getDb("kokuzo");

  const now = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO khs_apply_log
    (
      applyId,
      createdAt,
      threadId,
      turnId,
      mode,
      deltaSJson,
      lawKey,
      unitId,
      applyOp,
      decisionJson
    )
    VALUES
    (
      hex(randomblob(16)),
      ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  let count = 0;

  for (const k of lawKeys) {

    if (!k) continue;

    insert.run(
      now,
      threadId,
      "test-turn",
      "HYBRID",
      "{}",
      k,
      "",
      "LAW_APPLY",
      "{}"
    );

    count++;

  }

  return {
    usageRecorded: count
  };

}
