/**
 * TENMON_FRACTAL_LAW_KERNEL_FROM_KHS_CURSOR_AUTO_V1
 * KHS の法則を宇宙・身体・文明・会話へ使える fractal law kernel に抽象化（引用貼付けなし・Law 化優先）。
 */

export const FRACTAL_LAW_AXES_FROM_KHS_V1 = [
  "center",
  "split",
  "bind",
  "rise_fall",
  "shape",
  "cycle",
] as const;

const ORDER: readonly string[] = FRACTAL_LAW_AXES_FROM_KHS_V1 as unknown as string[];

export type FractalLawAxisProjectionV1 = {
  primary: string;
  secondary: string[];
  axes: readonly string[];
};

export type FractalLawKernelBundleV1 = {
  card: "TENMON_FRACTAL_LAW_KERNEL_FROM_KHS_CURSOR_AUTO_V1";
  version: 1;
  fractalLawAxis: FractalLawAxisProjectionV1;
  fractalTension: string | null;
  fractalRepairHint: string | null;
};

function sortByLawOrder(axes: Set<string>): string[] {
  return ORDER.filter((a) => axes.has(a));
}

function collectHits(msg: string, rr: string): Set<string> {
  const hits = new Set<string>();
  const add = (...axes: string[]) => {
    for (const a of axes) {
      if (ORDER.includes(a)) hits.add(a);
    }
  };

  // acceptance: なぜ言霊は宇宙法則なのか — center + cycle
  if (/言霊|宇宙法則|宇宙|なぜ|中心|芯|正中/u.test(msg)) add("center", "cycle");
  // acceptance: 火水の法則は人生にどう対応するか — split / rise_fall（対応は bind も拾うが主軸は水火）
  if (/火水|火水の法則|水火|分離|対立|峻別|人生に|人生と|人生/u.test(msg)) add("split", "rise_fall");
  if (/身体|天地|対応|結び|搦|からみ|交わり/u.test(msg)) add("bind", "center");
  if (/昇降|上下|浮沈|のぼり|くだり/u.test(msg)) add("rise_fall");
  // acceptance: 形仮名とは — shape（単語を優先）
  if (/形仮名|仮名|形|文明|姿|様式/u.test(msg)) add("shape");
  // acceptance: 社会の乱れをどう読むか — cycle + split（「読む」単独は広すぎるため入れない）
  if (/循環|巡り|乱れ|社会|秩序|回復|ループ/u.test(msg)) add("cycle", "split");

  if (hits.size === 0) {
    if (/^NATURAL_GENERAL|^GENERAL_KNOWLEDGE|^GENERAL_/u.test(rr)) add("center", "cycle");
    else if (/^DEF_/u.test(rr)) add("shape", "center");
    else if (/SCRIPTURE|TENMON_SCRIPTURE|TRUTH_GATE|K1_TRACE/u.test(rr)) add("center", "cycle");
    else if (/CONTINUITY_/u.test(rr)) add("center", "cycle");
    else if (/^R22_SELFAWARE_|CONSCIOUSNESS|意識/u.test(rr)) add("center", "bind");
    else add("center");
  }
  return hits;
}

/** ORDER 上は split が cycle より先だが、社会の乱れは循環の読みを主軸にする */
function pickPrimaryAxisV1(ordered: string[], msg: string): string {
  if (/社会|乱れ|秩序|崩れ/u.test(msg) && ordered.includes("cycle") && ordered.includes("split")) {
    return "cycle";
  }
  return ordered[0] ?? "center";
}

function inferFractalTensionV1(msg: string, primary: string): string | null {
  const m = msg;
  if (/宇宙|法則|言霊|なぜ/u.test(m) && /宇宙/u.test(m)) return "中心と周辺の対応（center↔cycle）が問われている";
  if (/火水|人生|対応/u.test(m)) return "水火の split が人生局面へ写像される緊張";
  if (/身体|天地/u.test(m)) return "身体と天地の bind（対応の緊張）";
  if (/社会|乱れ|秩序|崩れ/u.test(m)) return "循環の滞りと split の混同";
  if (primary === "cycle") return "循環の連続性と切断の両立";
  if (primary === "split") return "分離と再接続の両立";
  return null;
}

function inferFractalRepairHintV1(msg: string, primary: string): string | null {
  const m = msg;
  if (/宇宙|法則|言霊|なぜ/u.test(m)) return "center を一段固定し cycle を観測（引用なし）";
  if (/火水|人生/u.test(m)) return "split を一度だけ言語化し rise_fall を追う";
  if (/身体|天地/u.test(m)) return "bind を対応関係として一段だけ置く";
  if (/社会|乱れ/u.test(m)) return "cycle の断点と split の峻別を一段だけ";
  if (primary === "shape") return "shape を文明面の姿として一段だけ";
  return "観測軸を一つに絞る";
}

/**
 * 問いを fractal law 軸へ投影し、tension / repair hint を内部保持。
 */
export function projectFractalLawKernelFromKhsV1(message: string, routeReason?: string): FractalLawKernelBundleV1 {
  const msg = String(message || "").replace(/\s+/gu, " ").trim();
  const rr = String(routeReason || "").trim();
  const hits = collectHits(msg, rr);
  const ordered = sortByLawOrder(hits);
  const primary = pickPrimaryAxisV1(ordered, msg);
  const secondary = ordered.filter((a) => a !== primary).slice(0, 3);

  return {
    card: "TENMON_FRACTAL_LAW_KERNEL_FROM_KHS_CURSOR_AUTO_V1",
    version: 1,
    fractalLawAxis: {
      primary,
      secondary,
      axes: FRACTAL_LAW_AXES_FROM_KHS_V1,
    },
    fractalTension: inferFractalTensionV1(msg, primary),
    fractalRepairHint: inferFractalRepairHintV1(msg, primary),
  };
}

/** automation / seal 用（Law 軸定義の fail-closed 宣言） */
export function getFractalLawKernelFromKhsSealPayloadV1(): {
  card: "TENMON_FRACTAL_LAW_KERNEL_FROM_KHS_CURSOR_AUTO_V1";
  fractal_law_kernel_ready: true;
  law_projection_ready: true;
  axes: readonly string[];
} {
  return {
    card: "TENMON_FRACTAL_LAW_KERNEL_FROM_KHS_CURSOR_AUTO_V1",
    fractal_law_kernel_ready: true,
    law_projection_ready: true,
    axes: FRACTAL_LAW_AXES_FROM_KHS_V1,
  };
}

/** @deprecated projectFractalLawKernelFromKhsV1 を使用 */
export function projectFractalLawAxesFromKhsV1(message: string, routeReason?: string): FractalLawAxisProjectionV1 {
  return projectFractalLawKernelFromKhsV1(message, routeReason).fractalLawAxis;
}
