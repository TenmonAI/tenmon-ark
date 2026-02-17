/**
 * K4: TeNiWoHa check (warnings only)
 * - Deterministic
 * - Never throws
 * - Returns warnings array (may be empty)
 */
export function teniwohaWarnings(text: string): string[] {
  const s = typeof text === "string" ? text : "";
  const w: string[] = [];

  // MVP heuristics (very light):
  // If message ends without Japanese punctuation, suggest clarifying question mark.
  if (s.length > 0 && !/[。！？?!]$/.test(s.trim())) {
    w.push("KOSHIKI_K4: sentence may be incomplete (no terminal punctuation)");
  }
  // If contains many ASCII without spaces, warn.
  if (/[A-Za-z]{20,}/.test(s)) {
    w.push("KOSHIKI_K4: long ASCII sequence detected");
  }
  return w;
}
