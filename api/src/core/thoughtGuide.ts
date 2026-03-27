import fs from "node:fs";
import path from "node:path";

import {
  KHS_ROOT_FRACTAL_CONSTITUTION_V1,
  KHS_ROOT_PRIORITY_DECLARATION_V1,
} from "./khsRootFractalConstitutionV1.js";
import { FRACTAL_ROOT_AXES_EN_V1 } from "./tenmonKhsFractalRootV1.js";
import { FRACTAL_LAW_AXES_FROM_KHS_V1 } from "./tenmonFractalLawKernelV1.js";
import { KHS_PRIMARY_FOUR_MAPPING_EDGES_V1 } from "./tenmonMappingLayerV1.js";

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
  /** KHS を root constitution として固定（TENMON_KHS_FRACTAL_ROOT_CONSTITUTION_V1） */
  khsRootConstitutionCard?: string;
  khsRootAxes?: string[];
  /** 外部資料は写像レイヤー（root ではない） */
  externalSourcesAsMappingLayer?: boolean;
  khsRootPriorityDeclaration?: string;
  /** KHS fractal root 六軸（TENMON_KHS_FRACTAL_ROOT_CONSTITUTION / tenmonKhsFractalRootV1） */
  fractalRootAxesEn?: readonly string[];
  /** KHS 由来 fractal law 六軸（TENMON_FRACTAL_LAW_KERNEL_FROM_KHS / tenmonFractalLawKernelV1） */
  fractalLawAxesFromKhs?: readonly string[];
  /** KHS↔カタカムナ/いろは/空海/法華 の主4写像ラベル（mapping layer） */
  khsMappingPrimaryPairLabels?: readonly string[];
};

export function getThoughtGuideSummary(kind: "katakamuna" | "kotodama" | "scripture"): ThoughtGuideSummary | null {
  const base = getKatakamunaComparisonGuide();
  if (!base) return null;
  const roots: string[] = [...KHS_ROOT_FRACTAL_CONSTITUTION_V1.rootAxes];
  const mergedAxes = [...roots, ...base.tenmonPriorityAxes.filter((x) => !roots.includes(x))];
  return {
    guideKey: base.guideKey,
    comparisonAxes: base.comparisonAxes,
    responseIntentOrder: base.responseIntentOrder,
    tenmonPriorityAxes: mergedAxes,
    khsRootConstitutionCard: KHS_ROOT_FRACTAL_CONSTITUTION_V1.card,
    khsRootAxes: roots,
    externalSourcesAsMappingLayer: true,
    khsRootPriorityDeclaration: KHS_ROOT_PRIORITY_DECLARATION_V1,
    fractalRootAxesEn: FRACTAL_ROOT_AXES_EN_V1,
    fractalLawAxesFromKhs: FRACTAL_LAW_AXES_FROM_KHS_V1,
    khsMappingPrimaryPairLabels: KHS_PRIMARY_FOUR_MAPPING_EDGES_V1.map((e) => e.pairLabel),
  };
}

