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

function classifyGap(
  message: string,
  routeReason: string | null,
  resolvedLevel: string | null
): { kind: GapKind | null; reason: string } {
  const msg = message.trim();

  // すでに十分に解決しているものは gap から外す
  if (routeReason === "TENMON_SUBCONCEPT_CANON_V1" && resolvedLevel === "subconcept") {
    return { kind: null, reason: "subconcept で解決済み" };
  }
  if (routeReason === "TENMON_SCRIPTURE_CANON_V1" && resolvedLevel === "scripture") {
    return { kind: null, reason: "scripture で解決済み" };
  }

  // 一般整理・支援系
  if (resolvedLevel === "general") {
    return {
      kind: "persona_candidate",
      reason: "general 止まり。支援・整理の人格運用候補",
    };
  }

  // カタカムナ概念は scripture 深化候補
  if (routeReason === "KATAKAMUNA_CANON_ROUTE_V1" && resolvedLevel === "concept") {
    return {
      kind: "scripture_candidate",
      reason: "concept 止まり。カタカムナ言灵解・原典群で深化候補",
    };
  }

  // 言霊 verified は scripture 横断深化候補
  if (routeReason === "DEF_FASTPATH_VERIFIED_V1" && resolvedLevel === "verified") {
    if (/言霊とは何ですか？/.test(msg)) {
      return {
        kind: "scripture_candidate",
        reason: "verified 済みだが、言霊秘書・いろは・水火伝との横断深化候補",
      };
    }
    return { kind: null, reason: "verified で解決済み" };
  }

  // 未整備の下位粒度
  if (/(ア|ヒ|フ|ム|ウタヒ|五十音一言法則|五十連十行)/.test(msg)) {
    return {
      kind: "subconcept_candidate",
      reason: "下位粒度 canon 候補",
    };
  }

  // 比較・本質・系譜など
  if (/(なぜ|どうして|本質|違い|比較|系譜|位置づけ)/.test(msg)) {
    return {
      kind: "thought_guide_candidate",
      reason: "thought guide 深化候補",
    };
  }

  // 定義系は scripture 寄り
  if (/(とは|って何|何ですか|意味|定義|概念)/.test(msg)) {
    return {
      kind: "scripture_candidate",
      reason: "定義系の scripture 深化候補",
    };
  }

  return { kind: null, reason: "gap 対象外" };
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

  const out: CanonGapItem[] = [];

  for (const line of raw.split("\n")) {
    const [message, routeReason, resolvedLevel, n] = line.split("\t");
    const msg = String(message || "").trim();
    const rr = routeReason ? String(routeReason) : null;
    const rl = resolvedLevel ? String(resolvedLevel) : null;
    const count = Number(n || 0);

    const judged = classifyGap(msg, rr, rl);
    if (!judged.kind) continue;

    out.push({
      kind: judged.kind,
      message: msg,
      count,
      lastRouteReason: rr,
      lastResolvedLevel: rl,
      reason: judged.reason,
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
