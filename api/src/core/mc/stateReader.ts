// api/src/core/mc/stateReader.ts
// MC V2 FINAL — §8.2 State Reader (read-only JSON file reader)

import fs from 'node:fs';
import { MC_FILES, STALE_THRESHOLDS } from './constants.js';
import type { McBase } from './types.js';

export type McFileKey = keyof typeof MC_FILES;

/**
 * Read a collector JSON file and return parsed data with staleness info.
 * Returns null if file doesn't exist or is unreadable.
 */
export function readState<T extends McBase>(key: McFileKey): T | null {
  const filePath = MC_FILES[key];
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as T;

    // Compute staleness
    const threshold = (STALE_THRESHOLDS as Record<string, number>)[key] ?? 30 * 60;
    const generatedAt = data.generated_at ? new Date(data.generated_at).getTime() : 0;
    const age = (Date.now() - generatedAt) / 1000;
    data.stale = age > threshold;
    data.freshness = data.stale ? 'stale' : 'fresh';

    return data;
  } catch {
    return null;
  }
}

/**
 * Read raw JSON file content as string.
 * Returns null if file doesn't exist.
 */
export function readRawJson(key: McFileKey): string | null {
  const filePath = MC_FILES[key];
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Check if a collector file exists and return basic info.
 */
export function fileInfo(key: McFileKey): {
  exists: boolean;
  path: string;
  size_bytes: number;
  mtime: string | null;
} {
  const filePath = MC_FILES[key];
  try {
    const stat = fs.statSync(filePath);
    return {
      exists: true,
      path: filePath,
      size_bytes: stat.size,
      mtime: stat.mtime.toISOString(),
    };
  } catch {
    return {
      exists: false,
      path: filePath,
      size_bytes: 0,
      mtime: null,
    };
  }
}

/**
 * Return a map of all collector file statuses.
 */
export function allFileStatuses(): Record<McFileKey, ReturnType<typeof fileInfo>> {
  const result: Partial<Record<McFileKey, ReturnType<typeof fileInfo>>> = {};
  for (const key of Object.keys(MC_FILES) as McFileKey[]) {
    result[key] = fileInfo(key);
  }
  return result as Record<McFileKey, ReturnType<typeof fileInfo>>;
}
