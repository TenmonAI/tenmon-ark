// KOKŪZŌ v1.1: Semantic Indexing Engine

import type { ThinkingAxis } from "../persona/thinkingAxis.js";
import { getFile, readFileContent } from "./storage.js";
import { dbPrepare } from "../db/index.js";
import { transitionAxis } from "../persona/thinkingAxis.js";

export type KokuzoChunk = {
  id: number;
  file_id: number;
  content: string;
  summary: string;
  tags: string[];
  thinking_axis: ThinkingAxis;
  created_at: string;
};

export type KokuzoSeed = {
  id: number;
  source_type: "chat" | "file";
  source_id: number;
  essence: string;
  ruleset: Record<string, unknown>;
  created_at: string;
};

const insertChunkStmt = dbPrepare(
  "kokuzo",
  "INSERT INTO kokuzo_chunks (file_id, content, summary, tags, thinking_axis, created_at) VALUES (?, ?, ?, ?, ?, ?)"
);

const insertSeedStmt = dbPrepare(
  "kokuzo",
  "INSERT INTO kokuzo_seeds (source_type, source_id, essence, ruleset, created_at) VALUES (?, ?, ?, ?, ?)"
);

/**
 * Split text into semantic chunks (simple sentence-based splitting)
 */
function splitIntoChunks(text: string, maxChunkSize: number = 1000): string[] {
  const sentences = text.split(/[。\n]+/).filter((s) => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? "。" : "") + sentence;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Generate summary for a chunk (deterministic, simple extraction)
 */
function generateSummary(chunk: string): string {
  // Simple: first sentence + key phrases
  const sentences = chunk.split(/[。\n]+/).filter((s) => s.trim().length > 0);
  if (sentences.length === 0) return "";

  const firstSentence = sentences[0].trim();
  if (firstSentence.length > 100) {
    return firstSentence.substring(0, 100) + "...";
  }

  return firstSentence;
}

/**
 * Extract tags from chunk (simple keyword extraction)
 */
function extractTags(chunk: string): string[] {
  // Simple: extract words that appear multiple times (basic keyword detection)
  const words = chunk
    .replace(/[。、！？\n]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const wordCount: Record<string, number> = {};
  for (const word of words) {
    wordCount[word] = (wordCount[word] || 0) + 1;
  }

  // Return words that appear 2+ times, limited to 5 tags
  return Object.entries(wordCount)
    .filter(([_, count]) => count >= 2)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
}

/**
 * Assign thinking axis to chunk based on content
 * Uses Amatsu-Kanagi transition logic to maintain stateful axis progression
 */
function assignThinkingAxis(chunk: string, prevAxis: ThinkingAxis = "observational"): ThinkingAxis {
  // Use transitionAxis to determine next axis based on content
  // This maintains the stateful progression (observe → reflect → build → act)
  return transitionAxis(prevAxis, chunk, 0);
}

/**
 * Index a file: split into chunks, generate summaries, assign axes, extract tags
 */
export function indexFile(fileId: number): {
  chunks: KokuzoChunk[];
  seed: KokuzoSeed | null;
} {
  const file = getFile(fileId);
  if (!file) {
    throw new Error(`File not found: ${fileId}`);
  }

  const content = readFileContent(file.filepath);
  const rawChunks = splitIntoChunks(content);

  const chunks: KokuzoChunk[] = [];
  let prevAxis: ThinkingAxis = "observational";

  for (const rawChunk of rawChunks) {
    const summary = generateSummary(rawChunk);
    const tags = extractTags(rawChunk);
    const thinkingAxis = assignThinkingAxis(rawChunk, prevAxis);
    prevAxis = thinkingAxis;

    const timestamp = new Date().toISOString();
    const result = insertChunkStmt.run(
      fileId,
      rawChunk,
      summary,
      JSON.stringify(tags),
      thinkingAxis,
      timestamp
    ) as { lastInsertRowid: number };

    chunks.push({
      id: Number(result.lastInsertRowid),
      file_id: fileId,
      content: rawChunk,
      summary,
      tags,
      thinking_axis: thinkingAxis,
      created_at: timestamp,
    });
  }

  // Generate one seed per file
  const essence = chunks
    .map((c) => c.summary)
    .join(" | ")
    .substring(0, 500); // Compress to 500 chars

  const ruleset: Record<string, unknown> = {
    chunkCount: chunks.length,
    dominantAxis: chunks.reduce(
      (acc, c) => {
        acc[c.thinking_axis] = (acc[c.thinking_axis] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  };

  const seedTimestamp = new Date().toISOString();
  const seedResult = insertSeedStmt.run(
    "file",
    fileId,
    essence,
    JSON.stringify(ruleset),
    seedTimestamp
  ) as { lastInsertRowid: number };

  const seed: KokuzoSeed = {
    id: Number(seedResult.lastInsertRowid),
    source_type: "file",
    source_id: fileId,
    essence,
    ruleset,
    created_at: seedTimestamp,
  };

  return { chunks, seed };
}

