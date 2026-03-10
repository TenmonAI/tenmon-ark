import fs from "node:fs";
import path from "node:path";

export type SubconceptItem = {
  conceptKey: string;
  displayName: string;
  aliases: string[];
  short_definition: string;
  standard_definition: string;
  negative_definition: string[];
  core_axes: string[];
  related_scriptures: string[];
  next_axes: string[];
};

export type SubconceptCanonFile = {
  schema: string;
  updated_at: string;
  subconcepts: SubconceptItem[];
};

function canonPath(): string {
  return path.resolve(process.cwd(), "../canon/tenmon_subconcept_canon_v1.json");
}

let __cache: SubconceptCanonFile | null = null;

export function loadTenmonSubconceptCanon(): SubconceptCanonFile {
  if (__cache) return __cache;
  const p = canonPath();
  const raw = fs.readFileSync(p, "utf-8");
  const json = JSON.parse(raw) as SubconceptCanonFile;
  __cache = json;
  return json;
}

export function resolveSubconceptQuery(text: string): SubconceptItem | null {
  const qRaw = String(text || "").trim();
  const q = qRaw.toLowerCase();
  if (!q) return null;
  const canon = loadTenmonSubconceptCanon();

  const pairs: { item: SubconceptItem; alias: string }[] = [];
  for (const s of canon.subconcepts) {
    const names = [s.displayName, s.conceptKey, ...(s.aliases || [])]
      .map((x) => String(x || "").trim().toLowerCase())
      .filter(Boolean);
    for (const name of names) {
      pairs.push({ item: s, alias: name });
    }
  }
  // 長い alias を優先
  pairs.sort((a, b) => b.alias.length - a.alias.length);

  // 1) 完全一致優先
  for (const { item, alias } of pairs) {
    if (alias && (q === alias || qRaw === alias)) return item;
  }
  // 2) 前方一致（質問文の先頭〜など）
  for (const { item, alias } of pairs) {
    if (alias && (q.startsWith(alias) || alias.startsWith(q))) return item;
  }
  // 3) 部分一致（含まれる場合）
  for (const { item, alias } of pairs) {
    if (alias && (q.includes(alias) || alias.includes(q))) return item;
  }
  return null;
}

export function buildSubconceptResponse(
  conceptKey: string,
  level: "short" | "standard" = "standard"
): {
  conceptKey: string;
  displayName: string;
  text: string;
  negative_definition: string[];
  next_axes: string[];
} | null {
  const canon = loadTenmonSubconceptCanon();
  const hit = canon.subconcepts.find((s) => s.conceptKey === conceptKey);
  if (!hit) return null;

  const text = level === "short" ? hit.short_definition : hit.standard_definition;

  return {
    conceptKey: hit.conceptKey,
    displayName: hit.displayName,
    text,
    negative_definition: Array.isArray(hit.negative_definition) ? hit.negative_definition : [],
    next_axes: Array.isArray(hit.next_axes) ? hit.next_axes : [],
  };
}

