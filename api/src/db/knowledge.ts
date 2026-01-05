import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DBファイルのパス
const DB_PATH = path.resolve(process.cwd(), "db", "knowledge.sqlite");
// ストレージディレクトリのパス
const STORAGE_DIR = path.resolve(process.cwd(), "storage", "knowledge");

let db: DatabaseSync | null = null;

/**
 * ストレージディレクトリを確保
 */
function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

/**
 * データベースを初期化（テーブル作成）
 */
export function initDB(): void {
  ensureStorageDir();

  if (db) {
    return; // 既に初期化済み
  }

  db = new DatabaseSync(DB_PATH);

  // settings テーブル作成
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL DEFAULT 'TENMON-ARK',
      description TEXT NOT NULL DEFAULT '',
      instructions TEXT NOT NULL DEFAULT '',
      updatedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  // 初期レコードが無ければ作成
  const existing = db.prepare("SELECT COUNT(*) as count FROM settings").get() as { count: number };
  if (existing.count === 0) {
    db.prepare(`
      INSERT INTO settings (id, name, description, instructions, updatedAt)
      VALUES (1, 'TENMON-ARK', '', '', strftime('%s', 'now'))
    `).run();
  }

  // knowledge_files テーブル作成
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_files (
      id TEXT PRIMARY KEY,
      originalName TEXT NOT NULL,
      storedName TEXT NOT NULL,
      size INTEGER NOT NULL,
      mime TEXT NOT NULL,
      createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  console.log("[KNOWLEDGE-DB] Initialized:", DB_PATH);
}

/**
 * データベースインスタンスを取得
 */
function getDB(): DatabaseSync {
  if (!db) {
    initDB();
  }
  return db!;
}

/**
 * 設定を取得
 */
export function getSettings(): {
  name: string;
  description: string;
  instructions: string;
  updatedAt: number;
} {
  const db = getDB();
  const row = db.prepare("SELECT name, description, instructions, updatedAt FROM settings WHERE id = 1").get() as {
    name: string;
    description: string;
    instructions: string;
    updatedAt: number;
  } | undefined;

  if (!row) {
    // 初期レコードが無い場合はデフォルト値を返す
    return {
      name: "TENMON-ARK",
      description: "",
      instructions: "",
      updatedAt: Math.floor(Date.now() / 1000),
    };
  }

  return row;
}

/**
 * 設定を保存
 */
export function saveSettings(data: {
  name: string;
  description: string;
  instructions: string;
}): void {
  const db = getDB();
  db.prepare(`
    UPDATE settings
    SET name = ?, description = ?, instructions = ?, updatedAt = strftime('%s', 'now')
    WHERE id = 1
  `).run(data.name, data.description, data.instructions);
}

/**
 * 知識ファイル一覧を取得
 */
export function listKnowledgeFiles(): Array<{
  id: string;
  originalName: string;
  storedName: string;
  size: number;
  mime: string;
  createdAt: number;
}> {
  const db = getDB();
  const rows = db.prepare("SELECT id, originalName, storedName, size, mime, createdAt FROM knowledge_files ORDER BY createdAt DESC").all() as Array<{
    id: string;
    originalName: string;
    storedName: string;
    size: number;
    mime: string;
    createdAt: number;
  }>;
  return rows;
}

/**
 * 知識ファイルを登録
 */
export function insertKnowledgeFile(meta: {
  id: string;
  originalName: string;
  storedName: string;
  size: number;
  mime: string;
}): void {
  const db = getDB();
  db.prepare(`
    INSERT INTO knowledge_files (id, originalName, storedName, size, mime, createdAt)
    VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
  `).run(meta.id, meta.originalName, meta.storedName, meta.size, meta.mime);
}

/**
 * 知識ファイルを削除
 */
export function deleteKnowledgeFile(id: string): boolean {
  const db = getDB();
  const row = db.prepare("SELECT storedName FROM knowledge_files WHERE id = ?").get(id) as {
    storedName: string;
  } | undefined;

  if (!row) {
    return false; // ファイルが見つからない
  }

  // DBから削除
  db.prepare("DELETE FROM knowledge_files WHERE id = ?").run(id);

  // ファイルシステムからも削除
  const filePath = path.join(STORAGE_DIR, row.storedName);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err: any) {
    console.error("[KNOWLEDGE-DB] Failed to delete file:", filePath, err);
    // ファイル削除に失敗してもDBからは削除済みなので続行
  }

  return true;
}

