import type { NameAnalysisResult } from "./nameAnalyzer.js";

export interface SukuyouForIntegration {
  honmeiShuku: string;
  shukuElement?: string;
  shukuNature?: string;
}

export interface SukuyouIntegrationResult {
  alignmentType: "一致" | "ねじれ" | "中立";
  alignmentSummary: string;
  tensionSummary: string;
  correctionDirection: string;
  shortSynthesis: string;
}

function inferSukuyouPolarity(sukuyou: SukuyouForIntegration): number {
  const raw = `${sukuyou.shukuElement || ""} ${sukuyou.shukuNature || ""}`.toLowerCase();
  if (/火|陽|能動|外向|active|fire/.test(raw)) return 1;
  if (/水|陰|受容|内向|passive|water/.test(raw)) return -1;
  return 0;
}

function inferNamePolarity(name: NameAnalysisResult): number {
  if (name.outwardInwardBias === "outward") return 1;
  if (name.outwardInwardBias === "inward") return -1;
  return 0;
}

export function integrateSukuyouAndName(
  sukuyou: SukuyouForIntegration,
  name: NameAnalysisResult | null
): SukuyouIntegrationResult | null {
  if (!name) return null;

  // TENMON_SUKUYOU_NAME_INTEGRATOR_THRESHOLD_LOCK_V1
  // 一致: 宿と名前の方向が同符号 / ねじれ: 逆符号 / 中立: 差 < 0.2
  const sukuyouPolarity = inferSukuyouPolarity(sukuyou);
  const namePolarity = inferNamePolarity(name);
  const delta = Math.abs(Math.abs(sukuyouPolarity) - Math.abs(namePolarity));
  const alignmentType: "一致" | "ねじれ" | "中立" =
    delta < 0.2 && (sukuyouPolarity === 0 || namePolarity === 0)
      ? "中立"
      : sukuyouPolarity === namePolarity
        ? "一致"
        : "ねじれ";

  const shukuHint = `${sukuyou.honmeiShuku}宿`;
  const align =
    alignmentType === "一致"
      ? `${shukuHint}の基本リズムと名前音の方向が同調し、持ち味が強化されやすい傾向です。`
      : alignmentType === "ねじれ"
        ? `${shukuHint}の基本リズムと名前音の方向にずれがあり、場面によって推進と抑制がぶつかりやすい傾向です。`
        : `${shukuHint}に対して名前音は中立寄りで、外内の切替を担う緩衝軸として働きやすい傾向です。`;

  const tension =
    alignmentType === "一致"
      ? `一方で、同調が強いぶん勢いが過剰になる局面では、視野が狭まることがあります。`
      : alignmentType === "ねじれ"
        ? `一方で、外へ進む力と内へ戻る力が交錯し、意思決定が遅れることがあります。`
        : `一方で、中立のまま様子見が続くと、決断タイミングを逃しやすくなります。`;

  const correction =
    alignmentType === "一致"
      ? "勢いを保ったまま一呼吸置く区切りを作ると、強みを安定して使いやすくなります。"
      : alignmentType === "ねじれ"
        ? "小さな単位で外向き行動と内向き整理を交互に置くと、ねじれが緩みやすくなります。"
        : "目的を一文で固定してから着手すると、中立状態でも主軸を保ちやすくなります。";

  return {
    alignmentType,
    alignmentSummary: align,
    tensionSummary: tension,
    correctionDirection: correction,
    shortSynthesis: `${align} ${tension} ${correction}`,
  };
}
