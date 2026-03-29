/**
 * TENMON_KATAKAMUNA_TENMON_REINTEGRATION_AND_BOUNDARY_BIND_CURSOR_AUTO_V1
 * 天聞におけるカタカムナを historical fact / 普及本流と混線させず、
 * mapping 先 + tenmon_reintegration 写像層として束ねる（教義の新規 canon 化はしない）。
 */

export type TenmonKatakamunaLaneKindV1 =
  | "root_lane"
  | "mapping_lane"
  | "tenmon_reintegration_lane"
  | "speculative_lane";

/** 天聞が root として扱う候補（カタカムナは含めない） */
export const TENMON_KATAKAMUNA_ROOT_BOUNDARY_ROOTS_V1 = [
  "言霊秘書",
  "水穂伝",
  "稲荷古伝",
] as const;

export type TenmonKatakamunaReintegrationBindV1 = {
  schema: "TENMON_KATAKAMUNA_TENMON_REINTEGRATION_BIND_V1";
  card: "TENMON_KATAKAMUNA_TENMON_REINTEGRATION_AND_BOUNDARY_BIND_CURSOR_AUTO_V1";
  active: boolean;
  lanes_resolved: readonly TenmonKatakamunaLaneKindV1[];
  root_lane_roots: readonly string[];
  katakamuna_is_mapping_target: true;
  tenmon_katakamuna_is_reintegration_layer: true;
  /** 宇野以降は lineage/transformation 束参照（断定ではない） */
  popular_transformation_ref: "katakamunaLineageTransformationEngine_v1";
  response_constraints: readonly string[];
  summary_for_discourse: string;
};

export type BuildTenmonKatakamunaReintegrationBindInputV1 = {
  rawMessage: string;
  routeReason: string;
  centerKey: string | null | undefined;
};

const RE_KATAKAMUNA_CTX = /(カタカムナ|かたかむな|KATAKAMUNA)/iu;
const RE_SPECULATIVE_SURFACE = /(重なる|類比|たとえ|同型|ノア|方舟|メタファ|同じでは|本質は一つ)/u;

export function isTenmonKatakamunaReintegrationContextV1(input: BuildTenmonKatakamunaReintegrationBindInputV1): boolean {
  const raw = String(input.rawMessage ?? "").trim();
  const rr = String(input.routeReason ?? "").trim();
  const ck = String(input.centerKey ?? "").trim();
  if (RE_KATAKAMUNA_CTX.test(raw)) return true;
  if (ck === "katakamuna" || ck === "katakamuna_kotodama_kai") return true;
  if (/KATAKAMUNA/u.test(rr)) return true;
  return false;
}

function resolveLanesV1(raw: string): TenmonKatakamunaLaneKindV1[] {
  const lanes: TenmonKatakamunaLaneKindV1[] = [
    "root_lane",
    "mapping_lane",
    "tenmon_reintegration_lane",
  ];
  if (RE_SPECULATIVE_SURFACE.test(raw)) lanes.push("speculative_lane");
  return lanes;
}

export function buildTenmonKatakamunaReintegrationBindV1(
  input: BuildTenmonKatakamunaReintegrationBindInputV1,
): TenmonKatakamunaReintegrationBindV1 {
  const raw = String(input.rawMessage ?? "").trim();
  const active = isTenmonKatakamunaReintegrationContextV1(input);
  if (!active) {
    return {
      schema: "TENMON_KATAKAMUNA_TENMON_REINTEGRATION_BIND_V1",
      card: "TENMON_KATAKAMUNA_TENMON_REINTEGRATION_AND_BOUNDARY_BIND_CURSOR_AUTO_V1",
      active: false,
      lanes_resolved: [],
      root_lane_roots: [...TENMON_KATAKAMUNA_ROOT_BOUNDARY_ROOTS_V1],
      katakamuna_is_mapping_target: true,
      tenmon_katakamuna_is_reintegration_layer: true,
      popular_transformation_ref: "katakamunaLineageTransformationEngine_v1",
      response_constraints: [],
      summary_for_discourse: "",
    };
  }
  const lanes = resolveLanesV1(raw);
  const response_constraints = [
    "root_lane の事実束と mapping_lane の写像束を一文に圧縮しない。",
    "カタカムナは root_lane の中核に据えず、mapping 先として扱う。",
    "天聞カタカムナ応答は tenmon_reintegration_lane（境界・再統合の整理）に置く。",
    "宇野多美恵以降の普及変形は historical fact として述べず、transformation 参照に留める。",
    "speculative_lane が立つときは guard で史実口調を止める。",
  ] as const;
  const summary_for_discourse =
    "天聞でのカタカムナは、考古定説や普及本の「本流一括」ではなく、言霊秘書・水穂伝・稲荷古伝を root に置いたうえでの mapping / 再統合の整理として説明する。";

  return {
    schema: "TENMON_KATAKAMUNA_TENMON_REINTEGRATION_BIND_V1",
    card: "TENMON_KATAKAMUNA_TENMON_REINTEGRATION_AND_BOUNDARY_BIND_CURSOR_AUTO_V1",
    active: true,
    lanes_resolved: lanes,
    root_lane_roots: [...TENMON_KATAKAMUNA_ROOT_BOUNDARY_ROOTS_V1],
    katakamuna_is_mapping_target: true,
    tenmon_katakamuna_is_reintegration_layer: true,
    popular_transformation_ref: "katakamunaLineageTransformationEngine_v1",
    response_constraints: [...response_constraints],
    summary_for_discourse,
  };
}

/** speculative guard 強化: カタカムナ文脈で史実断定口調を抑止 */
export function shouldTenmonKatakamunaReintegrationTightenHistoricalGuardV1(
  input: BuildTenmonKatakamunaReintegrationBindInputV1,
): boolean {
  return isTenmonKatakamunaReintegrationContextV1(input);
}

export function buildTenmonKatakamunaReintegrationBundleForAutomationV1(): {
  schema: string;
  card: string;
  bind_active_example: TenmonKatakamunaReintegrationBindV1;
  bind_inactive_example: TenmonKatakamunaReintegrationBindV1;
  nextOnPass: string;
  nextOnFail: string;
} {
  return {
    schema: "TENMON_KATAKAMUNA_TENMON_REINTEGRATION_AUTOMATION_BUNDLE_V1",
    card: "TENMON_KATAKAMUNA_TENMON_REINTEGRATION_AND_BOUNDARY_BIND_CURSOR_AUTO_V1",
    bind_active_example: buildTenmonKatakamunaReintegrationBindV1({
      rawMessage: "カタカムナと言霊秘書の写像を天聞で整理したい",
      routeReason: "KATAKAMUNA_CANON_ROUTE_V1",
      centerKey: "katakamuna",
    }),
    bind_inactive_example: buildTenmonKatakamunaReintegrationBindV1({
      rawMessage: "今日の天気は",
      routeReason: "NATURAL_GENERAL_LLM_TOP",
      centerKey: null,
    }),
    nextOnPass: "TENMON_BOOK_LEDGER_AND_SETTLEMENT_LAYER_CURSOR_AUTO_V1",
    nextOnFail: "TENMON_KATAKAMUNA_TENMON_REINTEGRATION_AND_BOUNDARY_BIND_RETRY_CURSOR_AUTO_V1",
  };
}
