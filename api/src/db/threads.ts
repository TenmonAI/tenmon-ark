// /opt/tenmon-ark/api/src/db/threads.ts
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DBファイルのパス（環境変数で上書き可能）
const DB_PATH = process.env.SQLITE_PATH || path.resolve(process.cwd(), "db", "threads.sqlite");

let db: DatabaseSync | null = null;

/**
 * データベースを初期化（テーブル作成）
 */
export function initThreadDB(): void {
  if (db) {
    return; // 既に初期化済み
  }

  // ディレクトリを確保
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new DatabaseSync(DB_PATH);

  // threads テーブル作成
  db.exec(`
    CREATE TABLE IF NOT EXISTS threads (
      thread_id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '新しい会話',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  // messages テーブル作成
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id) ON DELETE CASCADE
    )
  `);

  // インデックス作成
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
  `);
}

/**
 * スレッドの履歴を取得（直近Nターン）
 */
export function getThreadHistory(threadId: string, limit = 12): Array<{ role: "user" | "assistant"; content: string }> {
  if (!db) {
    initThreadDB();
  }

  const stmt = db!.prepare(`
    SELECT role, content
    FROM messages
    WHERE thread_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);

  const rows = stmt.all(threadId, limit) as Array<{ role: string; content: string }>;
  return rows.reverse().map((r) => ({
    role: r.role as "user" | "assistant",
    content: r.content,
  }));
}

/**
 * メッセージを保存
 */
export function saveMessage(threadId: string, role: "user" | "assistant", content: string): void {
  if (!db) {
    initThreadDB();
  }

  // スレッドが存在しない場合は作成
  const threadExists = db!.prepare("SELECT COUNT(*) as count FROM threads WHERE thread_id = ?").get(threadId) as { count: number };
  if (threadExists.count === 0) {
    db!.prepare("INSERT INTO threads (thread_id, title) VALUES (?, ?)").run(threadId, "新しい会話");
  }

  // メッセージを保存
  db!.prepare("INSERT INTO messages (thread_id, role, content) VALUES (?, ?, ?)").run(threadId, role, content);

  // スレッドの更新時刻を更新
  db!.prepare("UPDATE threads SET updated_at = strftime('%s', 'now') WHERE thread_id = ?").run(threadId);
}

/**
 * スレッドのタイトルを更新
 */
export function updateThreadTitle(threadId: string, title: string): void {
  if (!db) {
    initThreadDB();
  }

  db!.prepare("UPDATE threads SET title = ?, updated_at = strftime('%s', 'now') WHERE thread_id = ?").run(title, threadId);
}

