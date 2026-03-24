import { getDb, getDbPath, type DbKind } from "../db/index.js";

type Phase = "before" | "after";

function parsePhase(argv: string[]): Phase {
  const arg = argv.find((a) => a.startsWith("--phase="));
  if (!arg) return "before";
  const value = arg.split("=", 2)[1];
  return value === "after" ? "after" : "before";
}

function log(...args: unknown[]): void {
  // 専用 prefix でログを絞り込みやすくする
  console.log("[CARD_DB_REALITY_CHECK_AND_SEED_V1]", ...args);
}

function inspectRuntimeDbPath(kind: DbKind): string {
  // getDbPath は kind でもファイル名でも受け取れるが、ここでは kind を使う
  const filePath = getDbPath(kind);
  log("dbPath", { kind, filePath });
  return filePath;
}

function inspectPragmaDatabaseList(kind: DbKind): void {
  const db = getDb(kind);
  const rows = db.prepare("PRAGMA database_list;").all() as any[];
  log("pragma_database_list", rows);
}

function tableExists(kind: DbKind, table: string): boolean {
  const db = getDb(kind);
  const row = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1",
    )
    .get(table) as any;
  const exists = !!row && row.name === table;
  log("table_check", { table, exists });
  return exists;
}

function countRows(kind: DbKind, table: string): number | null {
  const db = getDb(kind);
  try {
    const row = db
      .prepare(`SELECT COUNT(*) AS c FROM ${table}`)
      .get() as any;
    const count = typeof row?.c === "number" ? row.c : null;
    log("table_count", { table, count });
    return count;
  } catch (e) {
    log("table_count_error", { table, error: String(e) });
    return null;
  }
}

function main(): void {
  const phase = parsePhase(process.argv.slice(2));
  log("start", { phase, pid: process.pid, argv: process.argv.slice(2) });

  // 1) 実 runtime DB 絶対パス
  const filePath = inspectRuntimeDbPath("kokuzo");

  // 2) PRAGMA database_list による path 再確認
  inspectPragmaDatabaseList("kokuzo");

  // 3) 主要テーブルの存在有無
  const tables = [
    "thread_center_memory",
    "book_continuation_memory",
    "kokuzo_pages",
    "khs_laws",
    "khs_units",
    "scripture_learning_ledger",
    "synapse_log",
  ];

  for (const t of tables) {
    tableExists("kokuzo", t);
  }

  // 4) thread_center_memory / book_continuation_memory の COUNT
  const counts: Record<string, number | null> = {};
  counts.thread_center_memory = countRows("kokuzo", "thread_center_memory");
  counts.book_continuation_memory = countRows(
    "kokuzo",
    "book_continuation_memory",
  );

  log("summary", { phase, filePath, counts });

  log("done", { phase });
}

main();

