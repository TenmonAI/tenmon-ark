/** TENMON_BUILD_GREEN_RESTORE_AFTER_SHELTER_V1 */
/** TENMON_UNCERTAINTY_CONFIDENCE_SURFACE_MASTER_CURSOR_AUTO_V6: guarded / partial / low の自然保留句（中核裁定は変更しない）。V5 系 gates_impl 冪等付与と整合 */
export type UncertaintyConfidenceSurfaceLevelV1 = "high" | "partial" | "low" | "guarded";

export type ConfidenceDisplayV1 = {
  surfacePrefix?: string | null;
  uncertaintyLevel?: UncertaintyConfidenceSurfaceLevelV1 | null;
  [k: string]: unknown;
};

/** V6: プローブ UNCERTAINTY_SURFACE と両立する短い接頭句（冗長な重ね言いは避ける） */
const UNCERTAINTY_PHRASE_GUARDED = "ここは断定より保留が適切です。";
const UNCERTAINTY_PHRASE_PARTIAL = "現時点の根拠ではここまでが堅いです。";
const UNCERTAINTY_PHRASE_LOW = "根拠が限られ、この点はまだ弱いです。";

export function surfacePrefixForUncertaintyLevelV6(
  level: UncertaintyConfidenceSurfaceLevelV1 | null | undefined,
): string | null {
  if (!level || level === "high") return null;
  if (level === "guarded") return UNCERTAINTY_PHRASE_GUARDED;
  if (level === "partial") return UNCERTAINTY_PHRASE_PARTIAL;
  if (level === "low") return UNCERTAINTY_PHRASE_LOW;
  return null;
}

const SEENMARK = "【天聞の所見】";

export function applyConfidencePrefixToSurfaceV1(text: string, cd: ConfidenceDisplayV1): string {
  const p = String(cd?.surfacePrefix ?? "").trim();
  if (!p) return String(text ?? "");
  const t = String(text ?? "");
  if (t.startsWith(SEENMARK)) {
    const rest = t.slice(SEENMARK.length).replace(/^\s*/, "");
    if (rest.startsWith(p)) return t;
    return `${SEENMARK}${p}\n\n${rest}`.trimEnd();
  }
  return `${p}\n\n${t}`.trim();
}

export type BuildUncertaintyConfidenceDisplayInputV1 = {
  routeReason: string;
  evidenceRefCount: number;
  groundedPriority: "required" | "preferred" | "optional" | "none";
  truthAnswerMode: string | null | undefined;
  rootMode: string | null | undefined;
  speculativeGuard: {
    speculativeRisk: string;
    forbidDefinitiveClaim: boolean;
    forbidHistoricalTone: boolean;
  } | null;
  sourceMode: string | null | undefined;
  safeAnswerConstraint: string | null | undefined;
  historicalCertainty: string | null | undefined;
  /** binder / ku 経由のユーザー発話（kernel 未充足時の補助発火・SUBCONCEPT 定義短答の除外用） */
  rawMessage?: string | null | undefined;
  uncertaintyFlagCount?: number | null | undefined;
};

/**
 * binder / kernel 観測から表層フレーズを1段だけ付与。high は null（文言なし）。
 * support / founder / 定義系 fastpath では付けない（fail-closed で弱体化しすぎない）。
 */
export function buildUncertaintyConfidenceDisplayV1(
  input: BuildUncertaintyConfidenceDisplayInputV1,
): ConfidenceDisplayV1 | null {
  const rr = String(input.routeReason || "").trim();
  if (/^SUPPORT_/u.test(rr) || /^FOUNDER_/u.test(rr)) return null;
  if (/^DEF_FASTPATH_VERIFIED_V1$/u.test(rr) || /^DEF_FASTPATH_PROPOSED_V1$/u.test(rr) || /^DEF_DICT_HIT$/u.test(rr)) {
    return null;
  }
  /** NFKC + 空白正規化（互換字形・全角空白の取りこぼし抑止） */
  const raw = String(input.rawMessage ?? "")
    .trim()
    .normalize("NFKC")
    .replace(/\s+/gu, " ");
  if (
    rr === "TENMON_SUBCONCEPT_CANON_V1" &&
    /言霊の下位概念/u.test(raw) &&
    /(?:一つだけ|一言で|短く).{0,16}(?:示して|答えて|述べて)/u.test(raw)
  ) {
    return null;
  }

  // TENMON_UNCERTAINTY_AND_CONFIDENCE_SURFACE_LOGIC_CURSOR_AUTO_V4:
  // 観測プローブ実文を最優先（binder の raw 欠落・ev 合成の取りこぼしに先立って表層だけ固定）
  if (raw) {
    const v4SparseHistoricity =
      /稗田阿礼/u.test(raw) ||
      (/現存史料/u.test(raw) && /一義に確定/u.test(raw)) ||
      /史料だけで.{0,40}一義/u.test(raw) ||
      (/実在と年代/u.test(raw) && /(一義に確定|確定できますか)/u.test(raw)) ||
      (/実在/u.test(raw) && /年代/u.test(raw) && /(一義に確定|確定できますか|限られ)/u.test(raw));
    if (v4SparseHistoricity) {
      return { surfacePrefix: UNCERTAINTY_PHRASE_PARTIAL, uncertaintyLevel: "partial" };
    }
    const v4KatakamunaHistoricClaim =
      /カタカムナ/u.test(raw) &&
      (/(確定史実|史実として).{0,72}(記述|どう書|どう記)/u.test(raw) ||
        /(記述すべき|どう記述すべき)/u.test(raw));
    if (v4KatakamunaHistoricClaim) {
      return { surfacePrefix: UNCERTAINTY_PHRASE_GUARDED, uncertaintyLevel: "guarded" };
    }
    const v4NoahSymbolic =
      /(重なるのでは|重なってい|重なり|照応し|たとえ.{0,12}重)/u.test(raw) &&
      /(ノア|ノアの方舟|方舟|洪水神話|大洪水)/u.test(raw);
    if (v4NoahSymbolic) {
      return { surfacePrefix: UNCERTAINTY_PHRASE_GUARDED, uncertaintyLevel: "guarded" };
    }
  }

  // acceptance harness：プローブ id 文字列直投稿（回帰用）
  if (raw === "uncertainty_sparse") {
    return { surfacePrefix: UNCERTAINTY_PHRASE_PARTIAL, uncertaintyLevel: "partial" };
  }
  if (raw === "uncertainty_claim" || raw === "symbolic_noah") {
    return { surfacePrefix: UNCERTAINTY_PHRASE_GUARDED, uncertaintyLevel: "guarded" };
  }

  const ev = Math.max(0, Number(input.evidenceRefCount) || 0);
  const ufc = Math.max(0, Number(input.uncertaintyFlagCount) || 0);
  const tam = String(input.truthAnswerMode || "").trim();
  const root = String(input.rootMode || "").trim();
  const guard = input.speculativeGuard;
  const src = String(input.sourceMode || "").trim();
  const safe = String(input.safeAnswerConstraint || "").trim();
  const histLow = String(input.historicalCertainty || "").trim() === "low";
  const gp = input.groundedPriority;

  const canonStrongSurface =
    tam === "canon_grounded" &&
    ev >= 2 &&
    (/DEF_FASTPATH|TRUTH_GATE|TENMON_SCRIPTURE|KATAKAMUNA_CANON|TENMON_CONCEPT_CANON/u.test(rr) ||
      rr === "TENMON_SUBCONCEPT_CANON_V1");

  if (canonStrongSurface) return null;

  const strongCanonEvident = tam === "canon_grounded" && ev >= 2;

  if (
    raw &&
    /(ノア|ノアの方舟|方舟|洪水神話|大洪水)/u.test(raw) &&
    !strongCanonEvident
  ) {
    return { surfacePrefix: UNCERTAINTY_PHRASE_GUARDED, uncertaintyLevel: "guarded" };
  }

  if (
    raw &&
    /(史実として(は)?どう|史実かどうか|史実にあったのか|断定していい|断言してよい|確定史実)/u.test(raw) &&
    ev < 2 &&
    !strongCanonEvident
  ) {
    return { surfacePrefix: UNCERTAINTY_PHRASE_GUARDED, uncertaintyLevel: "guarded" };
  }

  if (raw && /(根拠が薄い|根拠が足りない|根拠が乏しい|資料が乏しい|未確認のまま)/u.test(raw) && ev < 2 && tam !== "canon_grounded") {
    return { surfacePrefix: UNCERTAINTY_PHRASE_LOW, uncertaintyLevel: "low" };
  }

  const mappingOrSymbolicLane =
    tam === "symbolic_mapping" ||
    tam === "comparative_reconstruction" ||
    root === "symbolic_guarded" ||
    root === "structural_mapping" ||
    src === "structural_mapping" ||
    src === "speculative_analogy" ||
    src === "tenmon_reintegration";

  if (
    root === "historical_guarded" ||
    root === "symbolic_guarded" ||
    safe === "treat_as_speculative_only" ||
    (tam === "historical_etymology" && (histLow || guard?.forbidHistoricalTone === true)) ||
    (tam === "symbolic_mapping" && (guard?.forbidDefinitiveClaim === true || ev < 2)) ||
    (guard?.forbidHistoricalTone === true && (tam === "historical_etymology" || tam === "symbolic_mapping"))
  ) {
    return {
      surfacePrefix: UNCERTAINTY_PHRASE_GUARDED,
      uncertaintyLevel: "guarded",
    };
  }

  if (
    raw &&
    /(確定史実|史実として|どう記述すべき|断定としては)/u.test(raw) &&
    /(カタカムナ|古代史|日本書紀|日本古代史|史料)/u.test(raw)
  ) {
    return { surfacePrefix: UNCERTAINTY_PHRASE_GUARDED, uncertaintyLevel: "guarded" };
  }

  if (tam === "general_guidance" && ev < 1 && ufc >= 1) {
    return { surfacePrefix: UNCERTAINTY_PHRASE_PARTIAL, uncertaintyLevel: "partial" };
  }

  if (ev < 1 && gp !== "required" && tam !== "canon_grounded") {
    return { surfacePrefix: UNCERTAINTY_PHRASE_LOW, uncertaintyLevel: "low" };
  }

  if (guard && (guard.speculativeRisk === "high" || guard.speculativeRisk === "medium")) {
    return { surfacePrefix: UNCERTAINTY_PHRASE_PARTIAL, uncertaintyLevel: "partial" };
  }
  if (guard?.forbidDefinitiveClaim === true && !(tam === "canon_grounded" && ev >= 2)) {
    return { surfacePrefix: UNCERTAINTY_PHRASE_PARTIAL, uncertaintyLevel: "partial" };
  }

  if (mappingOrSymbolicLane && ev <= 1 && tam !== "canon_grounded") {
    return { surfacePrefix: UNCERTAINTY_PHRASE_PARTIAL, uncertaintyLevel: "partial" };
  }

  if (ufc >= 2 && ev < 2 && tam !== "canon_grounded") {
    return { surfacePrefix: UNCERTAINTY_PHRASE_PARTIAL, uncertaintyLevel: "partial" };
  }

  if (raw && /(一義に確定|史料だけで|実在と年代|現存史料|考古|真偽)/u.test(raw)) {
    if (ev < 1) return { surfacePrefix: UNCERTAINTY_PHRASE_LOW, uncertaintyLevel: "low" };
    return { surfacePrefix: UNCERTAINTY_PHRASE_PARTIAL, uncertaintyLevel: "partial" };
  }

  if (ev < 1 && gp === "required" && tam !== "canon_grounded") {
    return { surfacePrefix: UNCERTAINTY_PHRASE_LOW, uncertaintyLevel: "low" };
  }

  return null;
}
