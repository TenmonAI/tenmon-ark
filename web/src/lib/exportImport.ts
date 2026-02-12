// web/src/lib/exportImport.ts
// PWA-MEM-01c: snapshot export + overwrite import (db.ts の現行APIに完全整合)

import {
  upsertThread,
  replaceThreadMessages,
  listMessagesByThread,
  dbGetAllSeeds,
  dbPutSeeds,
  type PersistThread,
  type PersistMessage,
  type PersistSeed,
} from "./db";

export type ExportPayloadV2 = {
  schemaVersion: 2;
  exportedAt: string;
  threads: PersistThread[];
  messages: Record<string, PersistMessage[]>;
  seeds: PersistSeed[];
};

export async function exportForDownload(): Promise<ExportPayloadV2> {
  // NOTE: 現状 db.ts に「全threads取得」が無いので threads は空で返す（次カードで追加）
  const threads: PersistThread[] = [];
  const seeds = await dbGetAllSeeds();
  const messages: Record<string, PersistMessage[]> = {};

  for (const t of threads) {
    messages[t.id] = await listMessagesByThread(t.id);
  }

  return {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    threads,
    messages,
    seeds,
  };
}

/**
 * Overwrite import only. schemaVersion must be 2.
 * “atomic” は dbClearAll を追加したカードで完成（今は既存APIだけで上書き）
 */
export async function importOverwrite(data: unknown): Promise<void> {
  if (!data || typeof data !== "object") throw new Error("invalid json");
  const payload = data as Partial<ExportPayloadV2>;
  if (payload.schemaVersion !== 2) {
    throw new Error(`UNSUPPORTED_SCHEMA_VERSION:${String(payload.schemaVersion ?? "unknown")}`);
  }

  const threads = Array.isArray(payload.threads) ? (payload.threads as PersistThread[]) : [];
  const messagesMap =
    payload.messages && typeof payload.messages === "object"
      ? (payload.messages as Record<string, PersistMessage[]>)
      : {};
  const seeds = Array.isArray(payload.seeds) ? (payload.seeds as PersistSeed[]) : [];

  // threads
  for (const t of threads) {
    if (!t || typeof t.id !== "string") continue;
    await upsertThread({ id: t.id, title: t.title, updatedAt: t.updatedAt });
  }

  // messages per thread（overwrite = replaceThreadMessages が delete+put を担う）
  for (const threadId of Object.keys(messagesMap)) {
    const arr = messagesMap[threadId];
    if (!Array.isArray(arr)) continue;

    const msgs: PersistMessage[] = [];
    for (const m of arr) {
      const mm = m as PersistMessage;
      if (!mm || typeof mm.id !== "string") continue;
      if (typeof mm.threadId !== "string") continue;
      if (mm.role !== "user" && mm.role !== "tenmon") continue;
      if (typeof mm.text !== "string") continue;
      msgs.push({
        id: mm.id,
        threadId: mm.threadId,
        role: mm.role,
        text: mm.text,
        createdAt: typeof mm.createdAt === "number" ? mm.createdAt : Date.now(),
      });
    }

    await replaceThreadMessages(threadId, msgs);
  }

  // seeds（overwrite = dbPutSeeds が clear+put）
  const ss: PersistSeed[] = [];
  for (const s of seeds) {
    const seed = s as PersistSeed;
    if (!seed || typeof seed.id !== "string") continue;
    ss.push(seed);
  }
  await dbPutSeeds(ss);
}
