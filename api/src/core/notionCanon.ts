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

  const pages = canon.pages || [,
  {
    pageId: "31e6514658e68054be64d9af4539aef5",
    title: "カタカムナ完全系統樹・決定版（暫定確定版）",
    role: "timeline_and_lineage",
    usefulFor: ["katakamuna_canon", "timeline_query", "lineage_query"],
    bindTargets: ["KATAKAMUNA_CANON_ROUTE_V1", "KATAKAMUNA_DETAIL_FASTPATH_V1"]
  },
  {
    pageId: "2daf4ddeab94463f8d83b89eaec99e17",
    title: "言灵秘書データベース",
    role: "kotodama_primary_index",
    usefulFor: ["kotodama_hisho", "law_index", "kotodama_query"],
    bindTargets: ["TENMON_KOTODAMA_HISYO_FRONT_V1", "TENMON_SCRIPTURE_CANON_V1"]
  },
  {
    pageId: "1b26514658e68079b6b3feef8b6c6037",
    title: "楢崎皐月のカタカムナ思考原理と解読内容",
    role: "narasaki_lineage_core",
    usefulFor: ["katakamuna_canon", "narasaki_query"],
    bindTargets: ["KATAKAMUNA_CANON_ROUTE_V1", "KATAKAMUNA_DETAIL_FASTPATH_V1"]
  },
  {
    pageId: "1b26514658e680efa05df244644a5d31",
    title: "空海・楢崎皐月・天聞のカタカムナ解釈と解読法の比較評価（空海の書物を言霊解読）",
    role: "kukai_narasaki_tenmon_bridge",
    usefulFor: ["katakamuna_canon", "kukai_axis", "comparison_query"],
    bindTargets: ["KATAKAMUNA_CANON_ROUTE_V1", "TENMON_SCRIPTURE_CANON_V1", "KATAKAMUNA_DETAIL_FASTPATH_V1"]
  },
];
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

