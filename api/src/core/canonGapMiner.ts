import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export type GapKind =
  | "scripture_candidate"
  | "subconcept_candidate"
  | "thought_guide_candidate"
  | "persona_candidate";

export type CanonGapItem = {
  kind: GapKind;
  message: string;
  count: number;
  lastRouteReason: string | null;
  lastResolvedLevel: string | null;
  reason: string;
};

const DB_PATH = "/opt/tenmon-ark-data/kokuzo.sqlite";

function runSql(sql: string): string {
  return execFileSync("sqlite3", ["-separator", "\t", DB_PATH, sql], {
    encoding: "utf-8",
  });
}

function classifyMessage(message: string): GapKind {
  if (/(とは|って何|何ですか|意味|定義|概念)/.test(message)) {
    if (/(ア|ヒ|フ|ム|ウタヒ|五十音一言法則|五十連十行)/.test(message)) {
      return "subconcept_candidate";
    }
    if (/(言霊秘書|イロハ言灵解|カタカムナ言灵解|水穂伝|稲荷古伝)/.test(message)) {
      return "scripture_candidate";
    }
    return "thought_guide_candidate";
  }
  if (/(なぜ|どうして|本質|違い|比較|系譜|位置づけ)/.test(message)) {
    return "thought_guide_candidate";
  }
  return "persona_candidate";
}

export function mineCanonGaps(limit = 200): CanonGapItem[] {
  const sql = `
    SELECT
      REPLACE(IFNULL(message,''), char(10), ' ') AS message,
      IFNULL(routeReason,'') AS routeReason,
      IFNULL(resolvedLevel,'') AS resolvedLevel,
      COUNT(*) AS n
    FROM scripture_learning_ledger
    WHERE IFNULL(message,'') <> ''
    GROUP BY message, routeReason, resolvedLevel
    ORDER BY n DESC, MAX(createdAt) DESC
    LIMIT ${Math.max(1, Number(limit) || 200)};
  `;

  const raw = runSql(sql).trim();
  if (!raw) return [];

  const rows = raw.split("\n").map((line) => {
    const [message, routeReason, resolvedLevel, n] = line.split("\t");
    return {
      message: String(message || "").trim(),
      routeReason: routeReason ? String(routeReason) : null,
      resolvedLevel: resolvedLevel ? String(resolvedLevel) : null,
      n: Number(n || 0),
    };
  });

  const out: CanonGapItem[] = [];

  for (const r of rows) {
    const msg = r.message;
    const rr = r.routeReason;
    const rl = r.resolvedLevel;

    const looksCanonical =
      /(とは|って何|何ですか|意味|定義|概念|関係|違い|比較|本質|系譜)/.test(msg);

    const shallow =
      rl === "general" ||
      (rl === "concept" && /(関係|違い|比較|本質|系譜)/.test(msg));

    if (!looksCanonical && !shallow) continue;

    out.push({
      kind: classifyMessage(msg),
      message: msg,
      count: r.n,
      lastRouteReason: rr,
      lastResolvedLevel: rl,
      reason: shallow
        ? "resolvedLevel が浅いか general/concept 止まり"
        : "canonical 昇格候補",
    });
  }

  return out;
}

export function writeCanonGapReport(
  outPath = "/opt/tenmon-ark-repo/docs/canon_gap_report_v1.md"
): string {
  const gaps = mineCanonGaps(200);

  const lines: string[] = [];
  lines.push("# CANON GAP REPORT V1");
  lines.push("");
  lines.push(`- generated_at_utc: ${new Date().toISOString()}`);
  lines.push("");

  const kinds: GapKind[] = [
    "scripture_candidate",
    "subconcept_candidate",
    "thought_guide_candidate",
    "persona_candidate",
  ];

  for (const kind of kinds) {
    lines.push(`## ${kind}`);
    lines.push("");
    const items = gaps.filter((x) => x.kind === kind);
    if (!items.length) {
      lines.push("- none");
      lines.push("");
      continue;
    }
    for (const it of items) {
      lines.push(`- message: ${it.message}`);
      lines.push(`  - count: ${it.count}`);
      lines.push(`  - lastRouteReason: ${it.lastRouteReason ?? "null"}`);
      lines.push(`  - lastResolvedLevel: ${it.lastResolvedLevel ?? "null"}`);
      lines.push(`  - reason: ${it.reason}`);
    }
    lines.push("");
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join("\n"), "utf-8");
  return outPath;
}
