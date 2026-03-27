/**
 * TENMON_SELF_LEARNING_KHS_SANSKRIT_FRACTAL_AUTOSTUDY — KHS 玄語法則を law kernel として抽象化（引用貼付けではなく軸）。
 */

export const KHS_GENGO_LAW_AXES_V1 = [
  "軽",
  "重",
  "清",
  "濁",
  "テニヲハ",
  "ヒチス三言同語",
  "一言法則",
  "五十連十行",
  "火水",
  "呼吸",
  "凝",
  "搦結",
  "生成",
  "循環",
  "正中",
] as const;

export type KhsGengoLawKernelBundleV1 = {
  card: "TENMON_SELF_LEARNING_KHS_SANSKRIT_FRACTAL_AUTOSTUDY_CURSOR_AUTO_V1";
  gengoLawAxis: string;
  gengoLawCenter: string;
  gengoLawTension: string | null;
  gengoLawProjectionHint: string;
};

function pickAxis(msg: string): string {
  const m = msg;
  if (/軽重|清濁/u.test(m)) return "軽重清濁";
  if (/テニヲハ|てにをは/u.test(m)) return "テニヲハ";
  if (/ヒチス|三言同語/u.test(m)) return "ヒチス三言同語";
  if (/一言法則/u.test(m)) return "一言法則";
  if (/五十連|十行/u.test(m)) return "五十連十行";
  if (/火水|水火/u.test(m)) return "火水";
  if (/呼吸/u.test(m)) return "呼吸";
  if (/凝|搦|結/u.test(m)) return "凝・搦結";
  if (/循環|巡り/u.test(m)) return "循環";
  return "正中";
}

export function resolveKhsGengoLawKernelV1(message: string): KhsGengoLawKernelBundleV1 {
  const msg = String(message || "").replace(/\s+/gu, " ").trim();
  const ax = pickAxis(msg);
  return {
    card: "TENMON_SELF_LEARNING_KHS_SANSKRIT_FRACTAL_AUTOSTUDY_CURSOR_AUTO_V1",
    gengoLawAxis: ax,
    gengoLawCenter: `root:KHS;玄語:${ax}—裁定軸として読む（本文典拠は mapping）。`,
    gengoLawTension: msg.length >= 4 ? "軸が複数立ち上がるときの優先順位を一段だけ固定" : null,
    gengoLawProjectionHint: "軽重清濁・テニヲハ・ヒチスは文明構造の位相として扱い、断定的物語化しない。",
  };
}
