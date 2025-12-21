// KOKŪZŌ v1.1: Search Engine

import { dbPrepare } from "../db/index.js";
import type { KokuzoChunk, KokuzoSeed } from "./indexer.js";

const searchChunksStmt = dbPrepare(
  "kokuzo",
  `SELECT 
    c.id, c.file_id, c.content, c.summary, c.tags, c.thinking_axis, c.created_at,
    f.filename
  FROM kokuzo_chunks c
  JOIN kokuzo_files f ON c.file_id = f.id
  WHERE c.content LIKE ? OR c.summary LIKE ?
  ORDER BY c.created_at DESC
  LIMIT 50`
);

const getSeedsByFileStmt = dbPrepare(
  "kokuzo",
  "SELECT id, source_type, source_id, essence, ruleset, created_at FROM kokuzo_seeds WHERE source_type = 'file' AND source_id = ?"
);

/**
 * Search chunks by query string
 */
export function searchChunks(query: string): Array<KokuzoChunk & { filename: string }> {
  const searchPattern = `%${query}%`;
  const rows = searchChunksStmt.all(searchPattern, searchPattern) as Array<{
    id: number;
    file_id: number;
    content: string;
    summary: string;
    tags: string;
    thinking_axis: string;
    created_at: string;
    filename: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    file_id: row.file_id,
    content: row.content,
    summary: row.summary,
    tags: JSON.parse(row.tags || "[]") as string[],
    thinking_axis: row.thinking_axis as KokuzoChunk["thinking_axis"],
    created_at: row.created_at,
    filename: row.filename,
  }));
}

/**
 * Get seeds related to a file
 */
export function getSeedsByFile(fileId: number): KokuzoSeed[] {
  const rows = getSeedsByFileStmt.all(fileId) as Array<{
    id: number;
    source_type: string;
    source_id: number;
    essence: string;
    ruleset: string;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    source_type: row.source_type as "file",
    source_id: row.source_id,
    essence: row.essence,
    ruleset: JSON.parse(row.ruleset || "{}") as Record<string, unknown>,
    created_at: row.created_at,
  }));
}

