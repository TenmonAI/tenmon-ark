// api/src/core/mc/sanitizer.ts
// MC V2 FINAL — §12 Sanitizer (secret scrubbing)

import { SECRET_PATTERNS } from './constants.js';

const REDACTED = '***REDACTED***';

/**
 * Deep-clone an object and redact any string values matching secret patterns.
 * Works recursively on objects and arrays.
 */
export function sanitize<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return scrubString(obj) as unknown as T;
  if (Array.isArray(obj)) return obj.map(item => sanitize(item)) as unknown as T;
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      // Redact entire value if key looks like a secret
      if (/password|secret|token|api_key|private_key/i.test(key) && typeof value === 'string') {
        result[key] = REDACTED;
      } else {
        result[key] = sanitize(value);
      }
    }
    return result as T;
  }
  return obj;
}

/**
 * Scrub a single string for secret patterns.
 */
function scrubString(s: string): string {
  let result = s;
  for (const pattern of SECRET_PATTERNS) {
    // Reset lastIndex for global patterns
    const p = new RegExp(pattern.source, pattern.flags);
    result = result.replace(p, REDACTED);
  }
  return result;
}

/**
 * Validate that a sanitized JSON string contains no leaked secrets.
 * Returns an array of detected leak descriptions (empty = clean).
 */
export function auditForLeaks(jsonStr: string): string[] {
  const leaks: string[] = [];
  for (const pattern of SECRET_PATTERNS) {
    const p = new RegExp(pattern.source, pattern.flags);
    const matches = jsonStr.match(p);
    if (matches) {
      leaks.push(`Pattern ${pattern.source}: ${matches.length} match(es)`);
    }
  }
  return leaks;
}
