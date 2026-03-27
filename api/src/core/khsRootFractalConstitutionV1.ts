/**
 * KHS_ROOT_FRACTAL_CONSTITUTION_V1
 * 言霊秘書（KHS）を天聞アークの root constitution / root reasoning source とする。
 * 外部資料・経典・一般知識は写像レイヤーとして扱う（本文捏造なし・メタ文字列の過剰露出は避ける）。
 */

export const KHS_ROOT_FRACTAL_CONSTITUTION_V1 = {
  card: "KHS_ROOT_FRACTAL_CONSTITUTION_V1",
  version: 1 as const,
  /** 唯一の root reasoning source として固定するラベル（資料名ではなく憲法上の位相） */
  rootSource: "言霊秘書_KHS",
  /** VPS / Notion / 他文献は根拠写像であり root と同一視しない */
  externalSourcesRole: "mapping_layer_not_root",
  /** 言霊秘書の中心命題を root axes として固定（順序固定） */
  rootAxes: ["音", "形", "火水", "凝結", "與合", "循環", "生成", "正中"] as const,
} as const;

export type KhsRootFractalConstitutionV1 = typeof KHS_ROOT_FRACTAL_CONSTITUTION_V1;

/** thoughtGuide / KU に載せる短い宣言（長文化しない） */
export const KHS_ROOT_PRIORITY_DECLARATION_V1 =
  "root:言霊秘書(KHS)。外部典拠は写像レイヤー。軸:音/形/火水/凝結/與合/循環/生成/正中。";

/**
 * routeReason ごとに KHS root 参照の強さを変えない（常に root は KHS）。
 * 返すのは「その route で thought core に載せる補助ラベル」のみ。
 */
export function resolveRouteFamilyKhsRootHintV1(routeReason: string): {
  routeFamily: string;
  khsRootRef: string;
} {
  const rr = String(routeReason || "").trim();
  if (/^DEF_/u.test(rr) || rr === "DEF_FASTPATH_VERIFIED_V1" || rr === "DEF_FASTPATH_PROPOSED_V1") {
    return { routeFamily: "define_kotodama", khsRootRef: "KHS_root:define" };
  }
  if (/^KUKAI_|^KATAKAMUNA|^IROHA_|KATAKAMUNA_CANON_ROUTE_V1/u.test(rr)) {
    return { routeFamily: "katakamuna_family", khsRootRef: "KHS_root:katakamuna_map" };
  }
  if (/SCRIPTURE|TENMON_SCRIPTURE|TRUTH_GATE|K1_TRACE|法華|hokekyo/u.test(rr)) {
    return { routeFamily: "scripture", khsRootRef: "KHS_root:scripture_map" };
  }
  if (/^R22_SELFAWARE_|CONSCIOUSNESS|意識/u.test(rr)) {
    return { routeFamily: "selfaware", khsRootRef: "KHS_root:selfaware_bridge" };
  }
  if (rr === "CONTINUITY_ROUTE_HOLD_V1" || /^CONTINUITY_/u.test(rr)) {
    return { routeFamily: "continuity", khsRootRef: "KHS_root:continuity_hold" };
  }
  if (/GENERAL_KNOWLEDGE|NATURAL_GENERAL|水火/u.test(rr)) {
    return { routeFamily: "general", khsRootRef: "KHS_root:general_map" };
  }
  return { routeFamily: "default", khsRootRef: "KHS_root:default" };
}
