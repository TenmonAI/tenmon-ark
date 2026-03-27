/**
 * TENMON_KHS_FRACTAL_ROOT_CONSTITUTION_CURSOR_AUTO_V1
 * 言霊秘書を天聞アークの root thought constitution / root reasoning source として固定。
 * 古事記神代は KHS root から読む。他資料は写像レイヤー（本文捏造なし）。
 */

import {
  KHS_ROOT_FRACTAL_CONSTITUTION_V1,
  resolveRouteFamilyKhsRootHintV1,
} from "./khsRootFractalConstitutionV1.js";

export const FRACTAL_ROOT_AXES_EN_V1 = [
  "center",
  "separation",
  "carami",
  "formation",
  "multiplicity",
  "circulation",
] as const;

export type FractalRootAxisBundleV1 = {
  card: "TENMON_KHS_FRACTAL_ROOT_CONSTITUTION_CURSOR_AUTO_V1";
  version: 1;
  rootThoughtConstitution: "KHS_only";
  /** 憲法上の root（唯一）。routeReason は変更しない。 */
  rootConstitutionSource: string;
  /** 当該 primary に対する KHS root 由来の中心一句（写像・本文捏造なし） */
  rootCenterClaim: string;
  axes: readonly string[];
  /** 当該問いの主座標 */
  primary: string;
  routeFamilyRef: string;
  khsRootRef: string;
  /** 古事記神代を KHS root から読む（神話説明ではなく生成相） */
  kojikiReadFromKhsRoot: boolean;
  otherMaterials: "mapping_layer_only";
};

function pickPrimaryFractalRootAxisV1(msg: string): string {
  const m = msg;
  // acceptance: 古事記の神代をどう読むか → formation
  if (/古事記|神代|神話|神産み|神世|大八|淤能|天地開闢/u.test(m)) return "formation";
  // acceptance: 火水の法則とは → separation
  if (/火水の法則|火水|水火|分離|対立|二項/u.test(m)) return "separation";
  // acceptance: 五十連十行とは → multiplicity
  if (/五十連十行|五十連|十行|いろは|イロハ|重ね|多層|多音/u.test(m)) return "multiplicity";
  if (/搦|絡|からみ|カラミ|交わり/u.test(m)) return "carami";
  if (/循環|巡り|回転|めぐり/u.test(m)) return "circulation";
  // acceptance: 言霊とは → center
  if (/言霊|言霊とは|kotodama|正中|芯|中心/u.test(m)) return "center";
  return "center";
}

/** primary ごとの中心一句（KHS root の位相のみ・外部典拠は写像） */
const ROOT_CENTER_CLAIM_BY_PRIMARY: Record<string, string> = {
  center: "root:KHS;座標:正中—言霊は形・音の正中で立つ。",
  separation: "root:KHS;座標:分離—火水の峻別は生成の前提。",
  carami: "root:KHS;座標:搦合—絡みは交わりの位相。",
  formation: "root:KHS;座標:形成—神代は生成相として読む（典拠は写像）。",
  multiplicity: "root:KHS;座標:多層—五十連十行は重ね読みの律。",
  circulation: "root:KHS;座標:循環—巡りは循環の位相。",
};

function rootCenterClaimForPrimary(primary: string): string {
  return ROOT_CENTER_CLAIM_BY_PRIMARY[primary] ?? ROOT_CENTER_CLAIM_BY_PRIMARY.center;
}

/**
 * thoughtCoreSummary / ku 用: KHS fractal root 束（route family 参照付き）。
 */
/** automation / seal 用の固定ペイロード（コード存在・軸定義の fail-closed 宣言） */
export function getKhsFractalRootConstitutionSealPayloadV1(): {
  card: "TENMON_KHS_FRACTAL_ROOT_CONSTITUTION_CURSOR_AUTO_V1";
  khs_root_fixed: true;
  fractal_root_axes_ready: true;
  route_reason_preserved: true;
  axes: readonly string[];
  rootConstitutionSource: string;
} {
  return {
    card: "TENMON_KHS_FRACTAL_ROOT_CONSTITUTION_CURSOR_AUTO_V1",
    khs_root_fixed: true,
    fractal_root_axes_ready: true,
    route_reason_preserved: true,
    axes: FRACTAL_ROOT_AXES_EN_V1,
    rootConstitutionSource: KHS_ROOT_FRACTAL_CONSTITUTION_V1.card,
  };
}

export function buildFractalRootAxisBundleV1(message: string, routeReason: string): FractalRootAxisBundleV1 {
  const msg = String(message || "").replace(/\s+/gu, " ").trim();
  const rr = String(routeReason || "").trim();
  const rf = resolveRouteFamilyKhsRootHintV1(rr);
  const primary = pickPrimaryFractalRootAxisV1(msg);
  const kojikiReadFromKhsRoot = /古事記|神代|神話|神産み|神世|天地開闢|伊邪那|大八島/u.test(msg);

  return {
    card: "TENMON_KHS_FRACTAL_ROOT_CONSTITUTION_CURSOR_AUTO_V1",
    version: 1,
    rootThoughtConstitution: "KHS_only",
    rootConstitutionSource: KHS_ROOT_FRACTAL_CONSTITUTION_V1.card,
    rootCenterClaim: rootCenterClaimForPrimary(primary),
    axes: FRACTAL_ROOT_AXES_EN_V1,
    primary,
    routeFamilyRef: rf.routeFamily,
    khsRootRef: rf.khsRootRef,
    kojikiReadFromKhsRoot,
    otherMaterials: "mapping_layer_only",
  };
}
