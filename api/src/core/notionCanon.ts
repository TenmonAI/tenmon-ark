import fs from "node:fs";
import path from "node:path";

export type NotionCanonPage = {
  pageId: string;
  title: string;
  role: string;
  usefulFor: string[];
  bindTargets: string[];
};

export type NotionCanonFile = {
  schema: string;
  updated_at: string;
  pages: NotionCanonPage[];
};

function canonPath(): string {
  return path.resolve(process.cwd(), "../canon/tenmon_notion_canon_v1.json");
}

let __cache: NotionCanonFile | null = null;

export function loadTenmonNotionCanon(): NotionCanonFile {
  if (__cache) return __cache;
  const p = canonPath();
  const raw = fs.readFileSync(p, "utf-8");
  const json = JSON.parse(raw) as NotionCanonFile;
  __cache = json;
  return json;
}

export function getNotionCanonForRoute(routeReason: string, rawMessage: string): NotionCanonPage[] {
  const canon = loadTenmonNotionCanon();
  const rr = String(routeReason || "").trim();
  const msg = String(rawMessage || "").trim();

  const pages = canon.pages || [];
  const hits = pages.filter((p) =>
    Array.isArray(p.bindTargets) && p.bindTargets.includes(rr)
  );

  // 追加で、特定語に応じた優先度を少しだけ持たせる
  const scored = hits.map((p) => {
    let score = 0;
    if (/言霊秘書/.test(msg) && p.title.includes("言灵秘書")) score += 10;
    if (/カタカムナ/.test(msg) && p.title.includes("カタカムナ")) score += 5;
    if (/本質/.test(msg) && p.title.includes("本質")) score += 3;
    return { page: p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((x) => x.page);
}

