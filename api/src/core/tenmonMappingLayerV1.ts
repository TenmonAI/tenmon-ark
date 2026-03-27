/**
 * TENMON_KATAKAMUNA_IROHA_MAPPING_LAYER_CURSOR_AUTO_V1
 * カタカムナ・いろは言霊解・法華/空海を KHS root からの mapping layer として整合（本文捏造なし）。
 */

import { KHS_ROOT_FRACTAL_CONSTITUTION_V1 } from "./khsRootFractalConstitutionV1.js";

export type MappingLayerTargetIdV1 =
  | "katakamuna"
  | "iroha_kotodama_kai"
  | "hokekyo"
  | "kukai"
  | "siddham";

/** KHS(root) ↔ 各資料層の論理辺（カード指定4本＋拡張。本文引用なし） */
export const KHS_MAPPING_EDGES_V1: ReadonlyArray<{
  id: string;
  root: "KHS";
  mappingTarget: MappingLayerTargetIdV1;
  edgeRole: "mapping_not_root";
  /** 写像ペアの短ラベル */
  pairLabel: string;
}> = [
  { id: "khs_katakamuna", root: "KHS", mappingTarget: "katakamuna", edgeRole: "mapping_not_root", pairLabel: "KHS↔カタカムナ" },
  { id: "khs_iroha", root: "KHS", mappingTarget: "iroha_kotodama_kai", edgeRole: "mapping_not_root", pairLabel: "KHS↔いろは言霊解" },
  { id: "khs_kukai", root: "KHS", mappingTarget: "kukai", edgeRole: "mapping_not_root", pairLabel: "KHS↔空海" },
  { id: "khs_hokekyo", root: "KHS", mappingTarget: "hokekyo", edgeRole: "mapping_not_root", pairLabel: "KHS↔法華経" },
  { id: "khs_siddham", root: "KHS", mappingTarget: "siddham", edgeRole: "mapping_not_root", pairLabel: "KHS↔悉曇" },
];

/** カード acceptance の主4写像（悉曇以外） */
export const KHS_PRIMARY_FOUR_MAPPING_EDGES_V1 = KHS_MAPPING_EDGES_V1.filter((e) => e.mappingTarget !== "siddham");

export type MappingLayerBundleV1 = {
  card: "TENMON_KATAKAMUNA_IROHA_MAPPING_LAYER_CURSOR_AUTO_V1";
  version: 1;
  rootConstitutionCard: string;
  /** 写像は root から導かれるが root ではない */
  mappedFromRoot: true;
  /** 0..1 内部保持（会話で数値を前面に出さない用途） */
  mappingConfidence: number;
  /** 活性 edge の pairLabel を結合（KHS↔各資料） */
  mappingPairLabel: string;
  activeMappingTargets: MappingLayerTargetIdV1[];
  activeEdgeIds: string[];
  /** root と写像を混同しないための内部短注 */
  separationNote: string;
  /** 混同禁止ルール（メタ） */
  rootMappingSeparationRule: string;
};

function detectMappingTargets(msg: string): MappingLayerTargetIdV1[] {
  const m = msg;
  const out: MappingLayerTargetIdV1[] = [];
  const add = (x: MappingLayerTargetIdV1) => {
    if (!out.includes(x)) out.push(x);
  };
  if (/カタカムナ|カタカムナウタ|ウタヒ/u.test(m)) add("katakamuna");
  if (/いろは|イロハ|五十連|十行|いろは言霊|言霊解/u.test(m)) add("iroha_kotodama_kai");
  if (/法華|法華経|一仏乗|方便|真実/u.test(m)) add("hokekyo");
  if (/空海|弘法|遍照金剛|即身成仏/u.test(m)) add("kukai");
  if (/悉曇|しったん|梵字/u.test(m)) add("siddham");
  return out;
}

function shouldResolveMappingLayerV1(msg: string): boolean {
  if (detectMappingTargets(msg).length > 0) return true;
  // acceptance: 言霊秘書とカタカムナの違いは
  if (/(言霊秘書|KHS).{0,40}(カタカムナ|いろは|イロハ)/u.test(msg)) return true;
  if (/(カタカムナ|いろは|イロハ).{0,40}(言霊秘書|違い|関係|比較)/u.test(msg)) return true;
  if (/(いろは|イロハ).{0,40}(五十連|十行|関係)/u.test(msg)) return true;
  if (/空海/u.test(msg) && /(KHS|言霊秘書|接点)/u.test(msg)) return true;
  if (/(法華|法華経)/u.test(msg) && /(水火|火水|関係)/u.test(msg)) return true;
  return false;
}

function confidenceForLayers(n: number, comparison: boolean): number {
  const base = 0.72 + Math.min(3, n) * 0.06;
  const c = comparison ? base + 0.05 : base;
  return Math.min(0.95, Math.round(c * 100) / 100);
}

/** automation / seal 用 */
export function getMappingLayerSealPayloadV1(): {
  card: "TENMON_KATAKAMUNA_IROHA_MAPPING_LAYER_CURSOR_AUTO_V1";
  mapping_layer_ready: true;
  root_vs_mapping_separated: true;
  edge_count: number;
  primary_four_pair_labels: readonly string[];
} {
  const four = KHS_PRIMARY_FOUR_MAPPING_EDGES_V1;
  return {
    card: "TENMON_KATAKAMUNA_IROHA_MAPPING_LAYER_CURSOR_AUTO_V1",
    mapping_layer_ready: true,
    root_vs_mapping_separated: true,
    edge_count: KHS_MAPPING_EDGES_V1.length,
    primary_four_pair_labels: four.map((e) => e.pairLabel),
  };
}

/**
 * カタカムナ・いろは・法華/空海/悉曇が話題のとき、KHS 写像レイヤー束を返す。該当なしは null。
 */
export function resolveMappingLayerBundleV1(message: string, _routeReason?: string): MappingLayerBundleV1 | null {
  const msg = String(message || "").replace(/\s+/gu, " ").trim();
  if (!msg || !shouldResolveMappingLayerV1(msg)) return null;

  let active = detectMappingTargets(msg);
  if (active.length === 0 && /(言霊秘書|KHS).*(カタカムナ|いろは)/u.test(msg)) {
    if (/カタカムナ/u.test(msg)) active.push("katakamuna");
    if (/いろは|イロハ/u.test(msg)) active.push("iroha_kotodama_kai");
  }
  if (active.length === 0 && /(いろは|イロハ).*(五十連|十行)/u.test(msg)) {
    active.push("iroha_kotodama_kai");
  }
  if (active.length === 0 && /空海/u.test(msg) && /(KHS|言霊秘書|接点)/u.test(msg)) {
    active.push("kukai");
  }
  if (active.length === 0 && /(法華|法華経)/u.test(msg) && /(水火|火水)/u.test(msg)) {
    active.push("hokekyo");
  }
  if (active.length === 0) return null;

  const comparison = /違い|比較|関係|対比/u.test(msg);
  const edgesHit = KHS_MAPPING_EDGES_V1.filter((e) => active.includes(e.mappingTarget));
  const edgeIds = edgesHit.map((e) => e.id);
  const mappingPairLabel = edgesHit.map((e) => e.pairLabel).join(" | ");

  return {
    card: "TENMON_KATAKAMUNA_IROHA_MAPPING_LAYER_CURSOR_AUTO_V1",
    version: 1,
    rootConstitutionCard: KHS_ROOT_FRACTAL_CONSTITUTION_V1.card,
    mappedFromRoot: true,
    mappingConfidence: confidenceForLayers(active.length, comparison),
    mappingPairLabel,
    activeMappingTargets: active,
    activeEdgeIds: edgeIds,
    separationNote:
      "root=言霊秘書(KHS)のみ。カタカムナ・いろは・空海・法華は mapping layer（KHS_PRIMARY_FOUR + 悉曇拡張）。混同禁止。",
    rootMappingSeparationRule: "唯一の root は KHS constitution。経典・カタカムナ・いろは・空海は写像先であり root と同一視しない。",
  };
}
