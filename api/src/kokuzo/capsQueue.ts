import fs from "node:fs";

export type CapsEntry = {
  doc: string;
  pdfPage: number;
  quality?: string[];
  caption: string;
  caption_alt?: string[];
  tags?: any;
  lawCandidates?: any[];
  source?: string;
  updatedAt?: string;
};

const DEFAULT_CAPS_PATH = "/opt/tenmon-ark-repo/reports/caps_queue/khs_caps_v1.jsonl";

export function resolveCapsPath(): string {
  const p = process.env.TENMON_CAPS_QUEUE_PATH?.trim();
  return p && p.length ? p : DEFAULT_CAPS_PATH;
}

export function debugCapsPath(): { path: string; exists: boolean; reason?: string } {
  const p = resolveCapsPath();
  let exists = false;
  let reason: string | undefined;
  try {
    exists = fs.existsSync(p);
    if (!exists) reason = "not_found";
  } catch (e) {
    exists = false;
    reason = "error";
  }
  if (exists) {
    try {
      fs.accessSync(p, fs.constants.R_OK);
    } catch {
      reason = "permission_denied";
    }
  }
  return { path: p, exists, reason };
}

export function getCaps(doc: string, pdfPage: number): CapsEntry | null {
  const p = resolveCapsPath();
  if (!fs.existsSync(p)) return null;

  const key = `${doc}:${pdfPage}`;
  let latest: CapsEntry | null = null;

  const lines = fs.readFileSync(p, "utf-8").split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    try {
      const j = JSON.parse(t) as CapsEntry;
      if (!j || typeof j.doc !== "string" || typeof j.pdfPage !== "number") continue;
      if (`${j.doc}:${j.pdfPage}` !== key) continue;
      if (typeof j.caption !== "string" || j.caption.trim().length === 0) continue;
      latest = j; // 後勝ち
    } catch {
      // skip bad line
    }
  }
  return latest;
}

export function debugCapsQueue(): { path: string; exists: boolean } {
  const p = resolveCapsPath();
  let exists = false;
  try {
    exists = fs.existsSync(p);
  } catch {
    exists = false;
  }
  return { path: p, exists };
}
