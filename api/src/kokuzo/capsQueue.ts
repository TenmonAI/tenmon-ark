import fs from "node:fs";
import path from "node:path";

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

function resolveCapsPath(): string {
  // 1) env > 2) repo/reports/... > 3) cwd/reports/...
  const envPath = String(process.env.TENMON_CAPS_QUEUE_PATH ?? "").trim();
  if (envPath) return envPath;

  const repoDir = String(process.env.TENMON_REPO_DIR ?? "").trim();
  if (repoDir) {
    return path.join(repoDir, "reports", "caps_queue", "khs_caps_v1.jsonl");
  }

  // heuristic: project root from cwd
  return path.join(process.cwd(), "reports", "caps_queue", "khs_caps_v1.jsonl");
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
