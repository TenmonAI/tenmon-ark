// KOKŪZŌ v1.1: File Storage Management

import fs from "node:fs";
import path from "node:path";
import { dbPrepare } from "../db/index.js";

const STORAGE_DIR = path.resolve(process.cwd(), "kokuzo", "storage");

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export type KokuzoFile = {
  id: number;
  filename: string;
  filepath: string;
  uploaded_at: string;
};

const insertFileStmt = dbPrepare(
  "kokuzo",
  "INSERT INTO kokuzo_files (filename, filepath, uploaded_at) VALUES (?, ?, ?)"
);

const getFileStmt = dbPrepare(
  "kokuzo",
  "SELECT id, filename, filepath, uploaded_at FROM kokuzo_files WHERE id = ?"
);

const listFilesStmt = dbPrepare(
  "kokuzo",
  "SELECT id, filename, filepath, uploaded_at FROM kokuzo_files ORDER BY uploaded_at DESC"
);

/**
 * Save uploaded file to storage and database
 */
export function saveFile(
  filename: string,
  fileBuffer: Buffer
): KokuzoFile {
  const timestamp = new Date().toISOString();
  const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
  const filepath = path.join(STORAGE_DIR, `${Date.now()}_${safeFilename}`);

  // Write file to storage
  fs.writeFileSync(filepath, fileBuffer);

  // Insert record into database
  const result = insertFileStmt.run(safeFilename, filepath, timestamp) as { lastInsertRowid: number };

  return {
    id: Number(result.lastInsertRowid),
    filename: safeFilename,
    filepath,
    uploaded_at: timestamp,
  };
}

/**
 * Get file by ID
 */
export function getFile(id: number): KokuzoFile | null {
  const row = getFileStmt.get(id) as
    | { id: number; filename: string; filepath: string; uploaded_at: string }
    | undefined;

  if (!row) return null;

  return {
    id: row.id,
    filename: row.filename,
    filepath: row.filepath,
    uploaded_at: row.uploaded_at,
  };
}

/**
 * List all files
 */
export function listFiles(): KokuzoFile[] {
  const rows = listFilesStmt.all() as Array<{
    id: number;
    filename: string;
    filepath: string;
    uploaded_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    filename: row.filename,
    filepath: row.filepath,
    uploaded_at: row.uploaded_at,
  }));
}

/**
 * Read file content
 */
export function readFileContent(filepath: string): string {
  return fs.readFileSync(filepath, "utf8");
}

