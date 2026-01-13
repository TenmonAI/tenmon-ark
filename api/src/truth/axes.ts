// /opt/tenmon-ark/api/src/truth/axes.ts
// Truth Axes Extractor（真理骨格を固定化）

import type { EvidencePack } from "../kotodama/evidencePack.js";

/**
 * 真理軸の定義
 */
export const TRUTH_AXES = [
  "火水",
  "体用",
  "正中",
  "生成鎖",
  "辞",
  "操作",
] as const;

export type TruthAxis = typeof TRUTH_AXES[number];

/**
 * 真理軸のパターン（EvidencePackから抽出）
 */
const AXIS_PATTERNS: Array<{ pattern: RegExp; axis: TruthAxis }> = [
  { pattern: /(火|水|火水|水火)/, axis: "火水" },
  { pattern: /(体|用|体用|用体)/, axis: "体用" },
  { pattern: /(正中|御中主|天之御中主|0|ヽ|中心)/, axis: "正中" },
  { pattern: /(生成鎖|凝|息|音|形仮名|五十連|十行|生成)/, axis: "生成鎖" },
  { pattern: /(辞|テニヲハ|てにをは|助詞)/, axis: "辞" },
  { pattern: /(省|延開|反約|反|約|略|転|操作)/, axis: "操作" },
];

/**
 * EvidencePackから真理軸を抽出
 */
export function inferTruthAxesFromEvidence(evidencePack: EvidencePack): TruthAxis[] {
  const axes: TruthAxis[] = [];
  const combinedText = [
    evidencePack.pageText,
    evidencePack.summary,
    ...evidencePack.laws.map(l => l.title + " " + l.quote),
  ].join(" ");

  for (const { pattern, axis } of AXIS_PATTERNS) {
    if (pattern.test(combinedText) && !axes.includes(axis)) {
      axes.push(axis);
    }
  }

  return axes;
}

/**
 * 骨格推論ステップを構築
 */
export function buildSteps(truthAxes: TruthAxis[], evidencePack: EvidencePack): string[] {
  const steps: string[] = [];

  if (truthAxes.length === 0) {
    steps.push("真理軸が検出されませんでした。");
    return steps;
  }

  // 1. 引用の確認
  if (evidencePack.laws.length > 0) {
    const topLaw = evidencePack.laws[0];
    steps.push(`資料より「${topLaw.title}」を引用`);
  } else if (evidencePack.pageText) {
    steps.push(`資料よりページ本文を参照`);
  }

  // 2. 真理軸の適用
  if (truthAxes.includes("火水")) {
    steps.push("火水の原理を適用");
  }
  if (truthAxes.includes("体用")) {
    steps.push("体用の関係を確認");
  }
  if (truthAxes.includes("正中")) {
    steps.push("正中（中心）の位置を確定");
  }
  if (truthAxes.includes("生成鎖")) {
    steps.push("生成鎖の構造を追跡");
  }
  if (truthAxes.includes("辞")) {
    steps.push("辞（助詞）の役割を確認");
  }
  if (truthAxes.includes("操作")) {
    steps.push("操作（省/延開/反約等）を適用");
  }

  // 3. 結論への導線
  steps.push("資料準拠の結論を導出");

  return steps;
}

/**
 * 不足している真理軸を検出
 */
export function detectMissingAxes(expectedAxes: TruthAxis[], foundAxes: TruthAxis[]): TruthAxis[] {
  return expectedAxes.filter(axis => !foundAxes.includes(axis));
}


