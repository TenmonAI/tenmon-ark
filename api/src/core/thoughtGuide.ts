import fs from "node:fs";
import path from "node:path";

export type ThoughtGuideItem = {
  guideKey: string;
  judgementOrder: string[];
  conceptPriority: string[];
  scripturePriority: string[];
  comparisonAxes: string[];
  antiGenericDrift: string[];
  forbiddenInference: string[];
  responseIntentOrder: string[];
  tenmonPriorityAxes: string[];
};

export type ThoughtGuideFile = {
  schema: string;
  updated_at: string;
  guides: ThoughtGuideItem[];
};

function canonPath(): string {
  return path.resolve(process.cwd(), "../canon/tenmon_thought_guide_v1.json");
}

let __cache: ThoughtGuideFile | null = null;

export function loadTenmonThoughtGuide(): ThoughtGuideFile {
  if (__cache) return __cache;
  const p = canonPath();
  const raw = fs.readFileSync(p, "utf-8");
  const json = JSON.parse(raw) as ThoughtGuideFile;
  __cache = json;
  return json;
}

export function getKatakamunaComparisonGuide(): ThoughtGuideItem | null {
  const canon = loadTenmonThoughtGuide();
  const hit =
    canon.guides.find((g) => g.guideKey === "KUKAI_NARASAKI_TENMON_KATAKAMUNA_AXIS") ||
    canon.guides[0];
  return hit || null;
}

export type ThoughtGuideSummary = {
  guideKey: string;
  comparisonAxes: string[];
  responseIntentOrder: string[];
  tenmonPriorityAxes: string[];
};

export function getThoughtGuideSummary(kind: "katakamuna" | "kotodama" | "scripture"): ThoughtGuideSummary | null {
  const base = getKatakamunaComparisonGuide();
  if (!base) return null;
  // 現状は1ガイドを共有し、将来 kind ごとに分岐させる想定
  return {
    guideKey: base.guideKey,
    comparisonAxes: base.comparisonAxes,
    responseIntentOrder: base.responseIntentOrder,
    tenmonPriorityAxes: base.tenmonPriorityAxes,
  };
}

